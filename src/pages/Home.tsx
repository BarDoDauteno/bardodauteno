import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../types/Post';
import PostCard from '../components/PostCard';
import '../styles/Home.css';

// 1. Tipo auxiliar para o estado do componente
type AggregatedPost = Post & {
    likesCount: number;
    aurasCount: number;
    commentsCount: number;
};

export default function Home() {
    // 2. Usando o tipo corrigido
    const [posts, setPosts] = useState<AggregatedPost[]>([]);
    const [loadingPosts, setLoadingPosts] = useState(true);
    const { user, isAdmin, loading: authLoading } = useAuth();

    // Função auxiliar para normalizar e buscar contadores (Pode ser isolada)
    const getPostWithCounts = async (p: any): Promise<AggregatedPost> => {
        const images: string[] = Array.isArray(p.image_url) ? p.image_url : (p.image_url ? [p.image_url] : []);

        // Contagem interações (⚠️ Lembre-se do problema N+1 Queries aqui ⚠️)
        const { data: interactions } = await supabase
            .from('PostInteractions')
            .select('liked, aurapost')
            .eq('post_id', p.id);

        const likesCount = interactions?.filter(i => i.liked).length ?? 0;
        const aurasCount = interactions?.filter(i => i.aurapost).length ?? 0;

        // Contagem comentários
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
        } as AggregatedPost; // Casting explícito para o tipo correto
    };

    // Fetch posts + interações
    const fetchPosts = async () => {
        setLoadingPosts(true);
        try {
            // Buscar posts
            const { data: postsData, error: postsError } = await supabase
                .from('Posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            // 3. Normaliza images e adiciona contadores em paralelo (Performance melhorada)
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

    // Realtime: INSERT, UPDATE, DELETE + atualização contadores
    useEffect(() => {
        const channel = supabase
            .channel('public:Posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Posts' }, async (payload) => {
                const newPost: any = payload.new;
                // 4. Reutiliza a função auxiliar para consistência
                const postWithCounts = await getPostWithCounts(newPost);
                setPosts(prev => [postWithCounts, ...prev]);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'Posts' }, async (payload) => {
                const updated: any = payload.new;
                // 4. Reutiliza a função auxiliar
                const postWithCounts = await getPostWithCounts(updated);
                setPosts(prev => prev.map(p => p.id === updated.id ? postWithCounts : p));
            })
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'Posts' }, (payload) => {
                const oldRow = payload.old as Post;
                setPosts(prev => prev.filter(p => p.id !== oldRow.id));
            })
            .subscribe();

        return () => {
            // 5. Adicionando verificação para garantir que o canal existe antes de remover (melhor prática)
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, []);

    if (authLoading || loadingPosts) return <p className="loading">Carregando...</p>;

    // ... restante do componente (sem mudanças)
    return (
        <div className="home-container">
            <div className="main-content">
                <section className="post-grid" aria-live="polite">
                    {posts.length > 0 ? posts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onDelete={isAdmin ? (id) => setPosts(prev => prev.filter(p => p.id !== id)) : undefined}
                        />
                    )) : <p>Nenhum post encontrado.</p>}
                </section>
            </div>
        </div>
    );
}