import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../types/Post';
import PostCard from '../components/PostCard';
import '../styles/Home.css';
import DominoRanking from '../pages/domino/DominoRanking';

type AggregatedPost = Post & {
    likesCount: number;
    aurasCount: number;
    commentsCount: number;
};

type PageType = 'posts' | 'memories' | 'jokes';

export default function Home() {
    const [regularPosts, setRegularPosts] = useState<AggregatedPost[]>([]);
    const [pinnedPost, setPinnedPost] = useState<AggregatedPost | null>(null);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const [activePage, setActivePage] = useState<PageType>('posts');
    const { user, isAdmin, loading: authLoading } = useAuth();
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

    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            let query = supabase
                .from('Posts')
                .select('*')
                .order('is_pinned', { ascending: false }) // Posts fixos primeiro
                .order('created_at', { ascending: false });

            // Filtra pelo tipo baseado na página ativa
            if (activePage === 'memories') {
                query = query.eq('post_type', 'memories');
            } else if (activePage === 'jokes') {
                query = query.eq('post_type', 'jokes');
            } else {
                query = query.eq('post_type', 'posts');
            }

            const { data: postsData, error: postsError } = await query;

            if (postsError) throw postsError;

            const normalized = await Promise.all((postsData ?? []).map(getPostWithCounts));

            // Separar posts fixos dos regulares
            const pinnedPosts = normalized.filter(post => post.is_pinned);
            const regularPostsList = normalized.filter(post => !post.is_pinned);

            // Pega apenas o primeiro post fixo (ou pode mostrar vários)
            setPinnedPost(pinnedPosts[0] || null);
            setRegularPosts(regularPostsList);

        } catch (err) {
            console.error('Erro ao buscar posts:', err);
            setPinnedPost(null);
            setRegularPosts([]);
        } finally {
            setLoadingPosts(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, [activePage]);

    useEffect(() => {
        if (location.pathname === '/memories') {
            setActivePage('memories');
        } else if (location.pathname === '/jokes') {
            setActivePage('jokes');
        } else {
            setActivePage('posts');
        }
    }, [location.pathname]);

    const renderContent = () => {
        switch (activePage) {
            case 'memories':
                return (
                    <div className="page-content">
                        <h2>Lembranças</h2>
                        <p className="coming-soon">Em breve - suas memórias favoritas aparecerão aqui!</p>
                    </div>
                );

            case 'jokes':
                return (
                    <div className="page-content">
                        <h2>Piadas</h2>
                        <p className="coming-soon">Em breve - as melhores piadas da comunidade!</p>
                    </div>
                );

            case 'posts':
            default:
                const latestRegularPosts = regularPosts.slice(0, 4);

                return (
                    <>
                        {isAdmin && (
                            <div className="create-post">
                                <Link to="/create-post">Criar Novo Post</Link>
                            </div>
                        )}

                        {/* POST FIXO */}
                        {pinnedPost && (
                            <div className="pinned-post-section">
                                <div className="pinned-label">📌 Post Fixado</div>
                                <PostCard
                                    key={`pinned-${pinnedPost.id}`}
                                    post={pinnedPost}
                                    onDelete={isAdmin ? (id) => {
                                        setPinnedPost(null);
                                        setRegularPosts(prev => prev.filter(p => p.id !== id));
                                    } : undefined}
                                />
                            </div>
                        )}

                        <section className="post-grid" aria-live="polite">
                            {latestRegularPosts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    onDelete={isAdmin ? (id) => setRegularPosts(prev => prev.filter(p => p.id !== id)) : undefined}
                                />
                            ))}

                            {latestRegularPosts.length === 0 && !pinnedPost && <p>Nenhum post encontrado.</p>}
                        </section>

                        <div className="view-all">
                            <Link to="/all-posts">Ver todos os posts</Link>
                        </div>
                    </>
                );
        }
    };

    if (authLoading || loadingPosts) return <p className="loading">Carregando...</p>;

    return (
        <div className="home-container">
            {/* Header Navigation - SEMPRE VISÍVEL NO TOPO */}
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
                        {isAdmin && <li><Link to="/create-post">Criar Post</Link></li>}
                    </ul>
                </aside>

                <main className="feed">
                    {renderContent()}
                </main>

                <aside className="ranking glass-box">
                    <DominoRanking />
                    {user && (
                        <Link to="/domino/analytics"><button className="analytics-btn">📊 ESTATISTICAS COMPLETAS</button></Link>
                    )}
                </aside>
            </div>
        </div>
    );
}