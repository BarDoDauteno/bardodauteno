import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
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

export default function MemoriesPage() {
    const [posts, setPosts] = useState<AggregatedPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [activePage, setActivePage] = useState<'posts' | 'memories' | 'jokes'>('memories');
    const { user: _user, isAdmin, loading: authLoading } = useAuth();
    const location = useLocation();

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

    const fetchMemories = async () => {
        setLoadingPosts(true);
        try {
            const { data: postsData, error: postsError } = await supabase
                .from('Posts')
                .select('*')
                .eq('post_type', 'memories')
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            const normalized = await Promise.all((postsData ?? []).map(getPostWithCounts));
            setPosts(normalized);
        } catch (err) {
            console.error('Erro ao buscar lembranças:', err);
            setPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    };

    useEffect(() => {
        fetchMemories();
    }, []);

    useEffect(() => {
        if (location.pathname === '/memories') {
            setActivePage('memories');
        } else if (location.pathname === '/jokes') {
            setActivePage('jokes');
        } else {
            setActivePage('posts');
        }
    }, [location.pathname]);

    if (authLoading || loadingPosts) return <p className="loading">Carregando lembranças...</p>;

    return (
        <div className="home-container">
            {/* Header Navigation */}
            <nav className="header-nav">
                <div className="nav-tabs">
                    <Link
                        to="/"
                        className={`nav-tab ${activePage === 'posts' ? 'active' : ''}`}
                    >
                        Posts
                    </Link>
                    <Link
                        to="/memories"
                        className={`nav-tab ${activePage === 'memories' ? 'active' : ''}`}
                    >
                        Lembranças
                    </Link>
                    <Link
                        to="/jokes"
                        className={`nav-tab ${activePage === 'jokes' ? 'active' : ''}`}
                    >
                        Piadas
                    </Link>
                </div>
            </nav>

            <div className="main-content">
                <aside className="sidebar glass-box">
                    <h2>Explorar</h2>
                    <ul>
                        <li><Link to="/" className={activePage === 'posts' ? 'active' : ''}>Posts</Link></li>
                        <li><Link to="/memories" className={activePage === 'memories' ? 'active' : ''}>Lembranças</Link></li>
                        <li><Link to="/jokes" className={activePage === 'jokes' ? 'active' : ''}>Piadas</Link></li>
                        <li><Link to="/ranking">Ranking</Link></li>
                        {isAdmin && <li><Link to="/create-post">Criar Post</Link></li>}
                    </ul>
                </aside>

                <main className="feed">

                    {isAdmin && (
                        <div className="create-post">
                            <Link to="/create-post">Criar Nova Lembrança</Link>
                        </div>
                    )}

                    <section className="post-grid" aria-live="polite">
                        {posts.length > 0 ? (
                            posts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onDelete={isAdmin ? (id) => setPosts(prev => prev.filter(p => p.id !== id)) : undefined}
                                />
                            ))
                        ) : (
                            <div className="no-posts">
                                <h3>Nenhuma lembrança encontrada</h3>
                                <p>Seja o primeiro a compartilhar uma memória especial!</p>
                                {isAdmin && (
                                    <Link to="/create-post" className="create-first-post">
                                        Criar Primeira Lembrança
                                    </Link>
                                )}
                            </div>
                        )}
                    </section>
                </main>

                <aside className="ranking glass-box">
                    <h2>Lembranças Populares</h2>
                    {posts.length > 0 ? (
                        <div className="top-posts">
                            {posts
                                .sort((a, b) => (b.likesCount + b.aurasCount) - (a.likesCount + a.aurasCount))
                                .slice(0, 3)
                                .map((post, index) => (
                                    <div key={post.id} className="top-post-item">
                                        <span className="rank-number">{index + 1}</span>
                                        <div className="post-preview">
                                            <h4>{post.title || 'Sem título'}</h4>
                                            <div className="post-stats">
                                                <span>❤️ {post.likesCount}</span>
                                                <span>✨ {post.aurasCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    ) : (
                        <p>Nenhuma lembrança ainda</p>
                    )}
                </aside>
            </div>
        </div>
    );
}