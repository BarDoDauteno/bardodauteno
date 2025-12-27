// components/WarpCanvas.tsx
import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
}

export const WarpCanvas: React.FC<{ speedMultiplier?: number }> = ({ speedMultiplier = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Configurar tamanho fixo
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    updateSize();

    // Inicializar estrelas com valores válidos
    const width = canvas.width;
    const height = canvas.height;
    const stars: Star[] = Array.from({ length: 400 }, () => ({
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        z: Math.random() * width + 1 // Garantir que z seja sempre > 0
    }));

    let animationFrameId: number;
    let isAnimating = true;

    const draw = () => {
      if (!isAnimating) return;
      
      const currentWidth = canvas.width;
      const currentHeight = canvas.height;
      
      // Limpar canvas
      ctx.fillStyle = 'rgba(5, 5, 5, 0.2)'; 
      ctx.fillRect(0, 0, currentWidth, currentHeight);
      
      const cx = currentWidth / 2;
      const cy = currentHeight / 2;
      ctx.fillStyle = '#ffffff';

      stars.forEach(star => {
        // Mover estrela
        star.z -= 10 * speedMultiplier;
        
        // Se estrela saiu da tela, reposicionar
        if (star.z <= 0.1) {
          star.z = currentWidth;
          star.x = Math.random() * currentWidth - currentWidth / 2;
          star.y = Math.random() * currentHeight - currentHeight / 2;
        }

        // Calcular posição 2D
        const x = cx + (star.x / star.z) * currentWidth;
        const y = cy + (star.y / star.z) * currentHeight;
        
        // Calcular tamanho (garantir que não seja negativo)
        const size = Math.max(0.1, (1 - star.z / currentWidth) * 3);

        // Desenhar apenas se estiver na tela
        if (x >= 0 && x <= currentWidth && y >= 0 && y <= currentHeight) {
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();
    
    const handleResize = () => {
      updateSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
        window.removeEventListener('resize', handleResize);
        isAnimating = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }
    };
  }, [speedMultiplier]);

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#050505',
        zIndex: -10 
      }} 
    />
  );
};