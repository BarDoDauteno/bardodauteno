
import React, { useState, useEffect } from 'react';
import '../styles/PostCard.css';
import type { Post } from '../types/Post';

type Props = {
    post: Post;
    onDelete?: (id: number) => void;
};

const MAX_IMAGES_VISIBLE = 3;

const PostCard: React.FC<Props> = ({ post, onDelete }) => {
    const [carouselOpen, setCarouselOpen] = useState(false);
    const [carouselIndex, setCarouselIndex] = useState(0);

    // garante que image_url é string[] (compatível com seu DB)
    const images: string[] = Array.isArray(post.image_url) ? post.image_url : [];

    const openCarousel = (index: number) => {
        // se clicar na imagem qualquer, abre o carrossel naquela imagem
        setCarouselIndex(index);
        setCarouselOpen(true);
    };

    const closeCarousel = () => setCarouselOpen(false);
    const nextImage = () => setCarouselIndex((p) => (p + 1) % Math.max(images.length, 1));
    const prevImage = () => setCarouselIndex((p) => (p - 1 + Math.max(images.length, 1)) % Math.max(images.length, 1));

    // bloqueia scroll no body quando carrossel está aberto
    useEffect(() => {
        document.body.classList.toggle('carousel-open', carouselOpen);
    }, [carouselOpen]);

    // teclado: ESC fecha, setas navegam
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
                                onKeyDown={(e) => { if (e.key === 'Enter') openCarousel(idx); }}
                                tabIndex={0}
                                aria-label={`Abrir imagem ${idx + 1}`}
                            >
                                <img src={url} alt={`Post image ${idx + 1}`} draggable={false} />
                                {isLastVisible && (
                                    <div className="more-overlay" aria-hidden>
                                        +{images.length - MAX_IMAGES_VISIBLE}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* CARROSSEL: fixed, fora do fluxo do grid */}
            {carouselOpen && (
                <div className="carousel-overlay" role="dialog" aria-modal="true" onClick={closeCarousel}>
                    <div className="carousel-bg" />
                    <div className="carousel-content" onClick={(e) => e.stopPropagation()}>
                        <button
                            className="carousel-btn prev"
                            onClick={(e) => { e.stopPropagation(); prevImage(); }}
                            aria-label="Imagem anterior"
                        >
                            ‹
                        </button>

                        <img
                            className="carousel-image"
                            src={images[carouselIndex]}
                            alt={`Imagem ${carouselIndex + 1} do post`}
                            draggable={false}
                        />

                        <button
                            className="carousel-btn next"
                            onClick={(e) => { e.stopPropagation(); nextImage(); }}
                            aria-label="Próxima imagem"
                        >
                            ›
                        </button>

                        <button
                            className="carousel-close"
                            onClick={(e) => { e.stopPropagation(); closeCarousel(); }}
                            aria-label="Fechar carrossel"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {onDelete && (
                <button className="delete-btn" onClick={() => onDelete(post.id)} aria-label="Excluir post">
                    Delete
                </button>
            )}
        </article>
    );
};

export default PostCard;
