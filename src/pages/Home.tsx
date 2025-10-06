import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../types/Post';
import PostCard from '../components/PostCard';
import '../styles/Home.css';

type AggregatedPost = Post & {
    likesCount: number;
    aurasCount: number;
    commentsCount: number;
};

export default function Home() {
    const [posts, setPosts] = useState<AggregatedPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const { user, isAdmin, loading: authLoading } = useAuth();

    const getPostWithCounts = async (p: any): Promise<AggregatedPost> => {
        const images: string[] = Array.isArray(p.image_url) ? p.image_url : (p.image_url ? [p.image_url] : []);

        const { data: interactions } = await supabase
            .from('PostInteractions')
            .select('liked, aurapost')
            .eq('post_id', p.id);

        const likesCount = interactions?.filter(i => i.liked).length ?? 0;
        const aurasCount = interactions?.filter(i => i.aurapost).length ?? 0;

        const { data: comments } = await supabase
            .from('PostComments')
            .select('id')
            .eq('post_id', p.id);

        const commentsCount = comments?.length ?? 0;

        return {
            ...p,
            image_url: images,
            likesCount,
            aurasCount,
            commentsCount
        } as AggregatedPost;
    };

    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            const { data: postsData, error: postsError } = await supabase
                .from('Posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            const normalized = await Promise.all((postsData ?? []).map(getPostWithCounts));
            setPosts(normalized);
        } catch (err) {
            console.error('Erro ao buscar posts:', err);
            setPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    if (authLoading || loadingPosts) return <p className="loading">Carregando...</p>;

    const latestPosts = posts.slice(0, 4); // últimos 4 posts

    return (
        <div className="home-container">
            <aside className="sidebar glass-box">
                <h2>Explorar</h2>
                <ul>
                    <li><Link to="/">🏠 Início</Link></li>
                    <li><Link to="/ranking">🏆 Ranking</Link></li>
                    {isAdmin && <li><Link to="/create-post">✍️ Criar Post</Link></li>}
                </ul>
            </aside>

            <main className="feed">
                {isAdmin && (
                    <div className="create-post">
                        <Link to="/create-post">✍️ Criar Novo Post</Link>
                    </div>
                )}

                <section className="post-grid" aria-live="polite">
                    {latestPosts.length > 0 ? latestPosts.map(post => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onDelete={isAdmin ? (id) => setPosts(prev => prev.filter(p => p.id !== id)) : undefined}
                        />
                    )) : <p>Nenhum post encontrado.</p>}
                </section>

                {posts.length > 4 && (
                    <div className="view-all">
                        <Link to="/all-posts">Ver todos os posts</Link>
                    </div>
                )}
            </main>

            <aside className="ranking glass-box">
                <h2>Ranking</h2>
                <p>Em breve</p>
            </aside>
        </div>
    );
}
