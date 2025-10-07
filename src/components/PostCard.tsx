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

interface PostInteraction {
    user_id: string;
    liked: boolean;
    aurapost: boolean;
}

const PostCard: React.FC<Props> = ({ post, onDelete }) => {
    const { user } = useAuth();

    const [likesCount, setLikesCount] = useState(0);
    const [aurapostCount, setAurapostCount] = useState(0);
    const [userLiked, setUserLiked] = useState(false);
    const [userAurapost, setUserAurapost] = useState(false);
    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);

    const files: string[] = Array.isArray(post.image_url) ? post.image_url : [];
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f));
    const videoFiles = files.filter(f => /\.(mp4|webm|ogg)$/i.test(f));
    const docFiles = files.filter(f => /\.(pdf|docx?|txt)$/i.test(f));

    // --- 🔄 Atualiza contagens globais e estado do usuário ---
    const fetchCounts = async () => {
        const { data, error } = await supabase
            .from('PostInteraction')
            .select('user_id, liked, aurapost')
            .eq('post_id', post.id);


        if (!error && data) {
            const totalLikes = data.filter(d => d.liked).length;
            const totalAura = data.filter(d => d.aurapost).length;
            setLikesCount(totalLikes);
            setAurapostCount(totalAura);

            if (user) {
                const userData = data.find(d => d.user_id === user.id);
                setUserLiked(!!userData?.liked);
                setUserAurapost(!!userData?.aurapost);
            }
        }
    };

    useEffect(() => {
        fetchCounts();

        // --- 🔴 Realtime subscription ---
        const channel = supabase
            .channel(`post-interactions-${post.id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'PostInteractions', filter: `post_id=eq.${post.id}` }, payload => {
                fetchCounts(); // Atualiza contagem sempre que houver mudança
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [post.id, user]);

    // --- ❤️ Curtir ---
    const handleLike = async () => {
        if (!user) return alert('Você precisa estar logado para curtir.');

        const newLiked = !userLiked;
        setUserLiked(newLiked);
        setLikesCount(prev => prev + (newLiked ? 1 : -1));

        const { error } = await supabase.from('PostInteractions').upsert(
            { post_id: post.id, user_id: user.id, liked: newLiked },
            { onConflict: ['post_id', 'user_id'] }
        );

        if (error) console.error('Erro ao curtir:', error);
    };

    // --- ✨ Aurapost ---
    const handleAurapost = async () => {
        if (!user) return alert('Você precisa estar logado para aurapost.');

        const newAurapost = !userAurapost;
        setUserAurapost(newAurapost);
        setAurapostCount(prev => prev + (newAurapost ? 1 : -1));

        const { error } = await supabase.from('PostInteractions').upsert(
            { post_id: post.id, user_id: user.id, aurapost: newAurapost },
            { onConflict: ['post_id', 'user_id'] }
        );

        if (error) console.error('Erro ao aurapost:', error);
    };

    // --- 🖼️ Carrossel ---
    const openCarousel = (index: number) => { setCarouselIndex(index); setCarouselOpen(true); };
    const closeCarousel = () => setCarouselOpen(false);
    const nextImage = () => setCarouselIndex(p => (p + 1) % imageFiles.length);
    const prevImage = () => setCarouselIndex(p => (p - 1 + imageFiles.length) % imageFiles.length);

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
                                <div className="more-overlay">+{imageFiles.length - MAX_IMAGES_VISIBLE}</div>
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
                        <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="doc-link">
                            📄 Documento {idx + 1}
                        </a>
                    ))}
                </div>
            )}

            {/* ❤️✨ Interações */}
            <div className="post-interactions">
                <button
                    className={`interaction-btn ${userLiked ? 'active' : ''}`}
                    onClick={handleLike}
                    title={userLiked ? 'Você curtiu este post' : 'Curtir'}
                >
                    ❤️ {likesCount}
                </button>
                <button
                    className={`interaction-btn ${userAurapost ? 'active' : ''}`}
                    onClick={handleAurapost}
                    title={userAurapost ? 'Você deu aura neste post' : 'Dar aura'}
                >
                    ✨ {aurapostCount}
                </button>
            </div>

            {onDelete && (
                <button className="delete-btn" onClick={() => onDelete(post.id)}>
                    Excluir
                </button>
            )}

            {/* 🖼️ Carrossel */}
            {carouselOpen && (
                <div className="carousel-overlay" onClick={closeCarousel}>
                    <div className="carousel-content" onClick={e => e.stopPropagation()}>
                        <button className="carousel-btn prev" onClick={e => { e.stopPropagation(); prevImage(); }}>‹</button>
                        <img src={imageFiles[carouselIndex]} alt={`Imagem ${carouselIndex + 1}`} className="carousel-image" />
                        <button className="carousel-btn next" onClick={e => { e.stopPropagation(); nextImage(); }}>›</button>
                        <button className="carousel-close" onClick={e => { e.stopPropagation(); closeCarousel(); }}>✕</button>
                    </div>
                </div>
            )}
        </article>
    );
};

export default PostCard;
