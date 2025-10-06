
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../types/Post';
import PostCard from '../components/PostCard';
import '../styles/Home.css';

export default function Home() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const { user, isAdmin, loading: authLoading } = useAuth();

    useEffect(() => {
        const fetchPosts = async () => {
            setLoadingPosts(true);
            try {
                const { data, error } = await supabase
                    .from('Posts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Erro ao buscar posts:', error);
                } else {
                    // garante que image_url seja array (compatibilidade)
                    const normalized = (data ?? []).map((p: any) => ({
                        ...p,
                        image_url: Array.isArray(p.image_url) ? p.image_url : (p.image_url ? [p.image_url] : []),
                    }));
                    setPosts(normalized as Post[]);
                }
            } catch (err) {
                console.error('Erro inesperado ao buscar posts:', err);
                setPosts([]);
            } finally {
                setLoadingPosts(false);
            }
        };

        fetchPosts();
    }, []);

    // Realtime: INSERT, UPDATE, DELETE
    useEffect(() => {
        const channel = supabase
            .channel('public:Posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Posts' }, (payload) => {
                const newPost = payload.new as Post;
                newPost.image_url = Array.isArray(newPost.image_url) ? newPost.image_url : (newPost.image_url ? [newPost.image_url] : []);
                setPosts((prev) => [newPost, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Posts' }, (payload) => {
                const updated = payload.new as Post;
                updated.image_url = Array.isArray(updated.image_url) ? updated.image_url : (updated.image_url ? [updated.image_url] : []);
                setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'Posts' }, (payload) => {
                const oldRow = payload.old as Post;
                setPosts((prev) => prev.filter((p) => p.id !== oldRow.id));
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    if (authLoading || loadingPosts) return <p className="loading">Carregando...</p>;

    return (
        <div className="home-container">
            <section className="banner">
                <h1>Bardo do Dauteno</h1>
                <p>Descubraa.</p>
            </section>

            <div className="main-content">
                <aside className="sidebar glass-box" aria-labelledby="explorar-title">
                    <h2 id="explorar-title">Explorar</h2>
                    <ul>
                        <li><Link to="/">🏠 Início</Link></li>
                        <li><Link to="/ranking">🏆 Ranking</Link></li>
                        {isAdmin && <li><Link to="/create-post">✍️ Criar Post</Link></li>}
                    </ul>

                    <div className="stats">
                        <h3>Estatísticas</h3>
                        <p>Total de posts: {posts.length}</p>
                    </div>

                    {user ? <p className="user-email">Logado como: {user.email}</p> : <Link to="/login" className="login-btn">Entrar</Link>}
                </aside>

                <section className="post-grid" aria-live="polite">
                    {posts.length > 0 ? posts.map((post) => (
                        <PostCard key={post.id} post={post} onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))} />
                    )) : <p>Nenhum post encontrado.</p>}
                </section>
            </div>
        </div>
    );
}
