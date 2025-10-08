import React, { useState, useEffect } from 'react';
import '../styles/PostCard.css';
import type { Post } from '../types/Post';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

type Props = {
    post: Post;
    onDelete?: (id: number) => void;
};

const MAX_IMAGES_VISIBLE = 3;

const PostCard: React.FC<Props> = ({ post, onDelete }) => {
    const { user } = useAuth();

    const [likesCount, setLikesCount] = useState(0);
    const [aurapostCount, setAurapostCount] = useState(0);
    const [userLiked, setUserLiked] = useState(false);
    const [userAurapost, setUserAurapost] = useState(false);
    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [loading, setLoading] = useState(false);

    const files: string[] = Array.isArray(post.image_url) ? post.image_url : [];
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    const videoFiles = files.filter(f => /\.(mp4|webm|ogg)$/i.test(f));
    const docFiles = files.filter(f => /\.(pdf|docx?|txt)$/i.test(f));

    // --- 🔄 Busca contagens e estado do usuário ---
    const fetchInteractions = async () => {
        try {

            console.log(`🔄 Buscando interações para post ${post.id}`);

            // Busca contagens totais
            const { data: countsData, error: countsError } = await supabase
                .from('PostInteractions')
                .select('liked, aurapost')
                .eq('post_id', post.id);

            if (countsError) {
                console.error('Erro ao buscar contagens:', countsError);
                return;
            }

            console.log(`📊 Contagens encontradas:`, countsData);
            console.log(`📈 Total de registros:`, countsData?.length);

            if (countsData) {
                const totalLikes = countsData.filter(d => d.liked).length;
                const totalAura = countsData.filter(d => d.aurapost).length;
                setLikesCount(totalLikes);
                setAurapostCount(totalAura);
                console.log(`❤️ Likes: ${totalLikes}, ✨ Aura: ${totalAura}`);
            }

            // Busca estado do usuário atual
            if (user) {
                console.log(`👤 Buscando interação do usuário ${user.id}`);
                const { data: userData, error: userError } = await supabase
                    .from('PostInteractions')
                    .select('liked, aurapost')
                    .eq('post_id', post.id)
                    .eq('user_id', user.id)
                    .single();

                if (userError && userError.code !== 'PGRST116') { // PGRST116 = nenhum resultado
                    console.log('ℹ️ Usuário ainda não interagiu com este post');
                } else if (userData) {
                    console.log(`✅ Estado do usuário: liked=${userData.liked}, aurapost=${userData.aurapost}`);

                    setUserLiked(userData.liked);
                    setUserAurapost(userData.aurapost);
                } else {
                    setUserLiked(false);
                    setUserAurapost(false);
                }
            }
        } catch (error) {
            console.error('Erro ao buscar interações:', error);
        }
    };

    useEffect(() => {
        fetchInteractions();

        // --- 🔴 Realtime subscription ---
        const channel = supabase
            .channel(`post-interactions-${post.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'PostInteractions',
                    filter: `post_id=eq.${post.id}`
                },
                (payload) => {
                    console.log('Mudança realtime:', payload);
                    fetchInteractions(); // Atualiza tudo quando houver mudança
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [post.id, user]);

    // --- ❤️ Curtir ---
    const handleLike = async () => {
        if (!user) {
            alert('Você precisa estar logado para curtir.');
            return;
        }

        if (loading) return;

        setLoading(true);
        const newLiked = !userLiked;


        console.log(`❤️ ${newLiked ? 'Curtindo' : 'Descurtindo'} post ${post.id}`);

        // Otimistic update
        setUserLiked(newLiked);
        setLikesCount(prev => prev + (newLiked ? 1 : -1));

        try {
            if (newLiked) {
                // Se está curtindo, upsert com liked=true
                const { error } = await supabase
                    .from('PostInteractions')
                    .upsert(
                        {
                            post_id: post.id,
                            user_id: user.id,
                            liked: true,
                            aurapost: userAurapost // Mantém o estado atual do aurapost
                        },
                        {
                            onConflict: 'post_id,user_id'
                        }
                    );

                if (error) {
                    console.error('❌ Erro ao curtir:', error);
                    throw error
                };
            } else {
                // Se está descurtindo, atualiza apenas o liked para false
                const { error } = await supabase
                    .from('PostInteractions')
                    .update({ liked: false })
                    .eq('post_id', post.id)
                    .eq('user_id', user.id);

                if (error) throw error;
            }
        } catch (error) {
            console.error('Erro ao atualizar curtida:', error);
            // Revert optimistic update em caso de erro
            setUserLiked(!newLiked);
            setLikesCount(prev => prev + (newLiked ? -1 : 1));
        } finally {
            setLoading(false);
        }
    };

    // --- ✨ Aurapost ---
    const handleAurapost = async () => {
        if (!user) {
            alert('Você precisa estar logado para dar aura.');
            return;
        }

        if (loading) return;

        setLoading(true);
        const newAurapost = !userAurapost;

        // Otimistic update
        setUserAurapost(newAurapost);
        setAurapostCount(prev => prev + (newAurapost ? 1 : -1));

        try {
            if (newAurapost) {
                // Se está dando aura, upsert com aurapost=true
                const { error } = await supabase
                    .from('PostInteractions')
                    .upsert(
                        {
                            post_id: post.id,
                            user_id: user.id,
                            liked: userLiked, // Mantém o estado atual da curtida
                            aurapost: true
                        },
                        {
                            onConflict: 'post_id,user_id'
                        }
                    );

                if (error) throw error;
            } else {
                // Se está removendo aura, atualiza apenas o aurapost para false
                const { error } = await supabase
                    .from('PostInteractions')
                    .update({ aurapost: false })
                    .eq('post_id', post.id)
                    .eq('user_id', user.id);

                if (error) throw error;
            }
        } catch (error) {
            console.error('Erro ao atualizar aura:', error);
            // Revert optimistic update em caso de erro
            setUserAurapost(!newAurapost);
            setAurapostCount(prev => prev + (newAurapost ? -1 : 1));
        } finally {
            setLoading(false);
        }
    };

    // --- 🖼️ Carrossel ---
    const openCarousel = (index: number) => {
        setCarouselIndex(index);
        setCarouselOpen(true);
    };

    const closeCarousel = () => setCarouselOpen(false);

    const nextImage = () => {
        setCarouselIndex(prev => (prev + 1) % imageFiles.length);
    };

    const prevImage = () => {
        setCarouselIndex(prev => (prev - 1 + imageFiles.length) % imageFiles.length);
    };

    return (
        <article className="post-card" aria-live="polite">
            {post.title && <h2 className="post-title">{post.title}</h2>}
            {post.content && <p className="post-content">{post.content}</p>}

            {/* 🖼️ Imagens */}
            {imageFiles.length > 0 && (
                <div className="post-images">
                    {imageFiles.slice(0, MAX_IMAGES_VISIBLE).map((url, idx) => (
                        <div key={idx} className="image-wrapper" onClick={() => openCarousel(idx)}>
                            <img src={url} alt={`Post image ${idx + 1}`} draggable={false} />
                            {idx === MAX_IMAGES_VISIBLE - 1 && imageFiles.length > MAX_IMAGES_VISIBLE && (
                                <div className="more-overlay">
                                    +{imageFiles.length - MAX_IMAGES_VISIBLE}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* 🎞️ Vídeos */}
            {videoFiles.length > 0 && (
                <div className="post-videos">
                    {videoFiles.map((url, idx) => (
                        <video key={idx} controls preload="metadata">
                            <source src={url} />
                            Seu navegador não suporta vídeos.
                        </video>
                    ))}
                </div>
            )}

            {/* 📄 Documentos */}
            {docFiles.length > 0 && (
                <div className="post-docs">
                    {docFiles.map((url, idx) => (
                        <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="doc-link"
                        >
                            📄 Documento {idx + 1}
                        </a>
                    ))}
                </div>
            )}

            {/* ❤️✨ Interações */}
            <div className="post-interactions">
                <button
                    className={`interaction-btn like-btn ${userLiked ? 'active' : ''} ${loading ? 'loading' : ''}`}
                    onClick={handleLike}
                    disabled={loading}
                    title={userLiked ? 'Descurtir' : 'Curtir'}
                >
                    {userLiked ? '❤️' : '🤍'} {likesCount}
                </button>

                <button
                    className={`interaction-btn aura-btn ${userAurapost ? 'active' : ''} ${loading ? 'loading' : ''}`}
                    onClick={handleAurapost}
                    disabled={loading}
                    title={userAurapost ? 'Remover aura' : 'Dar aura'}
                >
                    {userAurapost ? '✨' : '⭐'} {aurapostCount}
                </button>
            </div>

            {/* 🗑️ Botão de excluir (apenas para admin/owner) */}
            {onDelete && (
                <button
                    className="delete-btn"
                    onClick={() => onDelete(post.id)}
                    title="Excluir post"
                >
                    🗑️ Excluir
                </button>
            )}

            {/* 🖼️ Carrossel */}
            {carouselOpen && (
                <div className="carousel-overlay" onClick={closeCarousel}>
                    <div className="carousel-content" onClick={e => e.stopPropagation()}>
                        <button
                            className="carousel-btn prev"
                            onClick={e => { e.stopPropagation(); prevImage(); }}
                            aria-label="Imagem anterior"
                        >
                            ‹
                        </button>

                        <img
                            src={imageFiles[carouselIndex]}
                            alt={`Imagem ${carouselIndex + 1} de ${imageFiles.length}`}
                            className="carousel-image"
                        />

                        <button
                            className="carousel-btn next"
                            onClick={e => { e.stopPropagation(); nextImage(); }}
                            aria-label="Próxima imagem"
                        >
                            ›
                        </button>

                        <button
                            className="carousel-close"
                            onClick={e => { e.stopPropagation(); closeCarousel(); }}
                            aria-label="Fechar carrossel"
                        >
                            ✕
                        </button>

                        <div className="carousel-counter">
                            {carouselIndex + 1} / {imageFiles.length}
                        </div>
                    </div>
                </div>
            )}
        </article>
    );
};

export default PostCard;