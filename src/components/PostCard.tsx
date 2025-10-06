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

    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);

    const images: string[] = Array.isArray(post.image_url) ? post.image_url : [];

    const [likesCount, setLikesCount] = useState(post.likes_count || 0);
    const [aurapostCount, setAurapostCount] = useState(post.aura_count || 0);
    const [userLiked, setUserLiked] = useState(false);
    const [userAurapost, setUserAurapost] = useState(false);

    // Carrossel
    const openCarousel = (index: number) => {
        setCarouselIndex(index);
        setCarouselOpen(true);
    };
    const closeCarousel = () => setCarouselOpen(false);
    const nextImage = () => setCarouselIndex((p) => (p + 1) % Math.max(images.length, 1));
    const prevImage = () => setCarouselIndex((p) => (p - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));

    // Bloqueia scroll quando carrossel aberto
    useEffect(() => {
        document.body.classList.toggle('carousel-open', carouselOpen);
    }, [carouselOpen]);

    // Teclado
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (!carouselOpen) return;
            if (e.key === 'Escape') closeCarousel();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [carouselOpen, images.length]);

    // Pega estado do usuário sobre like/aurapost
    useEffect(() => {
        if (!user) return;
        const fetchInteraction = async () => {
            const { data, error } = await supabase
                .from('PostInteractions')
                .select('*')
                .eq('post_id', post.id)
                .eq('user_id', user.id)
                .single();
            if (!error && data) {
                setUserLiked(data.liked);
                setUserAurapost(data.aurapost);
                setLikesCount(data.likes_count || 0);
                setAurapostCount(data.aura_count || 0);
            }
        };
        fetchInteraction();
    }, [user, post.id]);

    // Toggle like
    const handleLike = async () => {
        if (!user) return alert('Você precisa estar logado para curtir.');
        try {
            const newLiked = !userLiked;
            const newLikesCount = likesCount + (newLiked ? 1 : -1);

            await supabase
                .from('PostInteractions')
                .upsert({
                    post_id: post.id,
                    user_id: user.id,
                    liked: newLiked,
                    likes_count: newLikesCount
                }, { onConflict: ['post_id', 'user_id'], merge: true });

            setUserLiked(newLiked);
            setLikesCount(newLikesCount);
        } catch (err) {
            console.error('Erro ao curtir post:', err);
        }
    };

    // Toggle aurapost
    const handleAurapost = async () => {
        if (!user) return alert('Você precisa estar logado para aurapost.');
        try {
            const newAurapost = !userAurapost;
            const newAurapostCount = aurapostCount + (newAurapost ? 1 : -1);

            await supabase
                .from('PostInteractions')
                .upsert({
                    post_id: post.id,
                    user_id: user.id,
                    aurapost: newAurapost,
                    aura_count: newAurapostCount
                }, { onConflict: ['post_id', 'user_id'], merge: true });

            setUserAurapost(newAurapost);
            setAurapostCount(newAurapostCount);
        } catch (err) {
            console.error('Erro ao aurapost:', err);
        }
    };

    return (
        <article className="post-card" aria-live="polite">
            {post.title && <h2 className="post-title">{post.title}</h2>}
            {post.content && <p className="post-content">{post.content}</p>}

            {images.length > 0 && (
                <div className="post-images" role="list">
                    {images.slice(0, MAX_IMAGES_VISIBLE).map((url, idx) => {
                        const isLastVisible = idx === MAX_IMAGES_VISIBLE - 1 && images.length > MAX_IMAGES_VISIBLE;
                        return (
                            <div
                                key={idx}
                                role="listitem"
                                className="image-wrapper"
                                onClick={() => openCarousel(idx)}
                                tabIndex={0}
                                aria-label={`Abrir imagem ${idx + 1}`}
                                onKeyDown={(e) => { if (e.key === 'Enter') openCarousel(idx); }}
                            >
                                <img src={url} alt={`Post image ${idx + 1}`} draggable={false} />
                                {isLastVisible && (
                                    <div className="more-overlay">+{images.length - MAX_IMAGES_VISIBLE}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {carouselOpen && (
                <div className="carousel-overlay" role="dialog" aria-modal="true" onClick={closeCarousel}>
                    <div className="carousel-bg" />
                    <div className="carousel-content" onClick={(e) => e.stopPropagation()}>
                        <button className="carousel-btn prev" onClick={(e) => { e.stopPropagation(); prevImage(); }}>‹</button>
                        <img className="carousel-image" src={images[carouselIndex]} alt={`Imagem ${carouselIndex + 1} do post`} draggable={false} />
                        <button className="carousel-btn next" onClick={(e) => { e.stopPropagation(); nextImage(); }}>›</button>
                        <button className="carousel-close" onClick={(e) => { e.stopPropagation(); closeCarousel(); }}>✕</button>
                    </div>
                </div>
            )}

            {onDelete && (
                <button className="delete-btn" onClick={() => onDelete(post.id)}>Delete</button>
            )}

            <div className="post-interactions">
                <button className={`interaction-btn ${userLiked ? 'active' : ''}`} onClick={handleLike}>
                    ❤️ {likesCount}
                </button>
                <button className={`interaction-btn ${userAurapost ? 'active' : ''}`} onClick={handleAurapost}>
                    ✨ {aurapostCount}
                </button>
            </div>
        </article>
    );
};

export default PostCard;
