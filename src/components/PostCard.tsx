import React, { useState, useEffect } from 'react';
import '../styles/PostCard.css';
import type { Post } from '../types/Post';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import ImageCarousel from './ImageCarousel';

type Props = {
    post: Post;
    onDelete?: (id: number) => void;
};

const MAX_IMAGES_VISIBLE = 3;

const PostCard: React.FC<Props> = ({ post, onDelete }) => {
    const { user } = useAuth();

    const [moggedCount, setMoggedCount] = useState(0);
    const [aurapostCount, setAurapostCount] = useState(0);
    const [userMogged, setUserMogged] = useState(false);
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


            // Busca contagens totais
            const { data: countsData, error: countsError } = await supabase
                .from('PostInteractions')
                .select('mogged, aurapost')
                .eq('post_id', post.id);

            if (countsError) {
                console.error('Erro ao buscar contagens:', countsError);
                return;
            }

            if (countsData) {
                const totalMogged = countsData.filter(d => d.mogged).length;
                const totalAura = countsData.filter(d => d.aurapost).length;
                setMoggedCount(totalMogged);
                setAurapostCount(totalAura);
            }

            // Busca estado do usuário atual
            if (user) {
                const { data: userData, error: userError } = await supabase
                    .from('PostInteractions')
                    .select('mogged, aurapost')
                    .eq('post_id', post.id)
                    .eq('user_id', user.id)
                    .single();

                if (userError && userError.code !== 'PGRST116') {
                    console.error('❌ Erro ao buscar interação do usuário:', userError);
                } else if (userData) {
                    setUserMogged(userData.mogged);
                    setUserAurapost(userData.aurapost);
                } else {
                    setUserMogged(false);
                    setUserAurapost(false);
                }
            }
        } catch (error) {
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
                    fetchInteractions();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [post.id, user]);

    // --- 👎 Moggar/Desmoggar (agora como dislike comum) ---
    const handleMog = async () => {
        if (!user) {
            alert('Você precisa estar logado para dar dislike.');
            return;
        }

        if (loading) return;

        setLoading(true);
        const newMogged = !userMogged;


        // Otimistic update
        const previousMogged = userMogged;
        const previousCount = moggedCount;

        setUserMogged(newMogged);
        setMoggedCount(prev => prev + (newMogged ? 1 : -1));

        try {
            if (newMogged) {
                // Adicionando dislike - usa upsert para criar ou atualizar
                const { error } = await supabase
                    .from('PostInteractions')
                    .upsert(
                        {
                            post_id: post.id,
                            user_id: user.id,
                            mogged: true,
                            aurapost: userAurapost // Mantém o estado atual do aurapost
                        },
                        {
                            onConflict: 'post_id,user_id'
                        }
                    );

                if (error) throw error;
            } else {
                // Removendo dislike - atualiza apenas o mogged para false
                const { error } = await supabase
                    .from('PostInteractions')
                    .update({ mogged: false })
                    .eq('post_id', post.id)
                    .eq('user_id', user.id);

                if (error) throw error;
            }
        } catch (error) {
            console.error('💥 Erro ao atualizar dislike:', error);
            // Revert optimistic update em caso de erro
            setUserMogged(previousMogged);
            setMoggedCount(previousCount);
        } finally {
            setLoading(false);
        }
    };

    // --- ✨ Aurapost (like) ---
    const handleAurapost = async () => {
        if (!user) {
            alert('Você precisa estar logado para dar like.');
            return;
        }

        if (loading) return;

        setLoading(true);
        const newAurapost = !userAurapost;

        // Otimistic update
        const previousAurapost = userAurapost;
        const previousCount = aurapostCount;

        setUserAurapost(newAurapost);
        setAurapostCount(prev => prev + (newAurapost ? 1 : -1));

        try {
            if (newAurapost) {
                // Adicionando like
                const { error } = await supabase
                    .from('PostInteractions')
                    .upsert(
                        {
                            post_id: post.id,
                            user_id: user.id,
                            mogged: userMogged, // Mantém o estado atual do dislike
                            aurapost: true
                        },
                        {
                            onConflict: 'post_id,user_id'
                        }
                    );

                if (error) throw error;
                console.log('✅ Like registrado no Supabase');
            } else {
                // Removendo like
                const { error } = await supabase
                    .from('PostInteractions')
                    .update({ aurapost: false })
                    .eq('post_id', post.id)
                    .eq('user_id', user.id);

                if (error) throw error;
                console.log('✅ Like removido no Supabase');
            }
        } catch (error) {
            console.error('💥 Erro ao atualizar like:', error);
            // Revert optimistic update em caso de erro
            setUserAurapost(previousAurapost);
            setAurapostCount(previousCount);
        } finally {
            setLoading(false);
        }
    };

    // --- 🖼️ Carrossel (mantido igual) ---
    const openCarousel = (index: number) => {
        setCarouselIndex(index);
        setCarouselOpen(true);
    };

    const closeCarousel = () => setCarouselOpen(false);



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

            {/* 👎✨ Interações (agora Like/Dislike) */}
            <div className="post-interactions">
                <button
                    className={`interaction-btn like-btn ${userAurapost ? 'active' : ''} ${loading ? 'loading' : ''}`}
                    onClick={handleAurapost}
                    disabled={loading}
                    title={userAurapost ? 'Remover like' : 'Curtir'}
                >
                    {userAurapost ? '✨' : '⭐'} {aurapostCount}
                </button>

                <button
                    className={`interaction-btn dislike-btn ${userMogged ? 'active' : ''} ${loading ? 'loading' : ''}`}
                    onClick={handleMog}
                    disabled={loading}
                    title={userMogged ? 'Remover dislike' : 'Não curtir'}
                >
                    {userMogged ? '🗑️' : '🗑️'} {moggedCount}
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

            {/* 🖼️ Carrossel (mantido igual) */}
            {/* 🖼️ Carrossel em tela cheia */}
            {carouselOpen && (
                <ImageCarousel
                    images={imageFiles}
                    initialIndex={carouselIndex}
                    onClose={closeCarousel}
                />
            )}
        </article>
    );
};

export default PostCard;