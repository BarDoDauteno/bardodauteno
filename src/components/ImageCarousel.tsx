import { useState, useEffect } from 'react';
import '../styles/ImageCarousel.css';

interface ImageCarouselProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageCarousel({ images, initialIndex = 0, onClose }: ImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [currentIndex, onClose]);

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };



    if (!images.length) return null;

    return (
        <div className="carousel-overlay" onClick={onClose}>
            <div className="carousel-container" onClick={(e) => e.stopPropagation()}>
                <button className="carousel-close" onClick={onClose}>
                    ✕
                </button>

                <button className="carousel-nav carousel-prev" onClick={prevImage}>
                    ‹
                </button>

                <div className="carousel-content">
                    <img
                        src={images[currentIndex]}
                        alt={`Imagem ${currentIndex + 1}`}
                        className="carousel-image"
                    />
                </div>

                <button className="carousel-nav carousel-next" onClick={nextImage}>
                    ›
                </button>



                <div className="carousel-counter">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>
        </div>
    );
}