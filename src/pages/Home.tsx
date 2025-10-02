import { useEffect, useState } from 'react'
import supabase from '../utils/supabase'
import type { Post } from '../types/Post'
import PostCard from '../components/PostCard'

export default function Home() {
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchPosts = async () => {
            const { data, error } = await supabase
                .from('Posts')
                .select('*')
                .order('created_at', { ascending: false }) // mais recentes primeiro

            if (error) {
                console.error('Erro ao buscar posts:', error)
            } else {
                setPosts(data as Post[])
            }
            setLoading(false)
        }

        fetchPosts()
    }, [])

    if (loading) return <p>Carregando posts...</p>

    return (
        <section className="post-grid">
            {posts.length > 0 ? (
                posts.map(post => (
                    <PostCard key={post.id} post={post} />
                ))
            ) : (
                <p>Nenhum post encontrado.</p>
            )}
        </section>
    )
}
