import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import supabase from '../utils/supabase'
import { useAuth } from '../context/AuthContext'
import type { Post } from '../types/Post'
import PostCard from '../components/PostCard'
import '../styles/Home.css'

export default function Home() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loadingPosts, setLoadingPosts] = useState(true)

    const { user, isAdmin, loading: authLoading } = useAuth()

    useEffect(() => {
        const fetchPosts = async () => {
            setLoadingPosts(true)
            try {
                const { data, error } = await supabase
                    .from('Posts')
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error('Erro ao buscar posts:', error)
                }
                else setPosts(data ?? [])

            } catch (err) {
                console.error('Erro inesperado ao buscar posts:', err)
                setPosts([])
            } finally {
                setLoadingPosts(false)
            }
        }

        fetchPosts()
    }, [])

    // Realtime: INSERT, UPDATE e DELETE
    useEffect(() => {
        // cria o channel
        const channel = supabase
            .channel('public:Posts')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Posts' },
                (payload) => {
                    const newPost = payload.new as Post
                    setPosts(prevPosts => [newPost, ...prevPosts])
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'Posts' },
                (payload) => {
                    const updatedPost = payload.new as Post
                    setPosts(prevPosts =>
                        prevPosts.map(p => (p.id === updatedPost.id ? updatedPost : p))
                    )
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'Posts' },
                (payload) => {
                    const deletedPost = payload.old as Post
                    setPosts(prevPosts => prevPosts.filter(p => p.id !== deletedPost.id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (authLoading || loadingPosts) return <p className="loading">Carregando...</p>

    return (
        <div className="home-container">
            <section className="banner">
                <h1>Bardo do Dauteno</h1>
                <p>Descubraa.</p>
            </section>

            <div className="main-content">
                <aside className="sidebar glass-box">
                    <h2>Explorar</h2>
                    <ul>
                        <li><Link to="/">🏠 Início</Link></li>
                        <li><Link to="/ranking">🏆 Ranking</Link></li>
                        {isAdmin && (
                            <li><Link to="/create-post">✍️ Criar Post</Link></li>
                        )}
                    </ul>

                    <div className="stats">
                        <h3>Estatísticas</h3>
                        <p>Total de posts: {posts.length}</p>
                    </div>

                    {user ? (
                        <p className="user-email">Logado como: {user.email}</p>
                    ) : (
                        <Link to="/login" className="login-btn">Entrar</Link>
                    )}
                </aside>

                <section className="post-grid">
                    {posts.length > 0 ? (
                        posts.map(post => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onDelete={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
                            />
                        ))
                    ) : (
                        <p>Nenhum post encontrado.</p>
                    )}
                </section>
            </div>
        </div>
    )
}
