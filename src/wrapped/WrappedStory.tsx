// components/wrapped/WrappedStory.tsx
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Pause, Home, ChevronLeft, ChevronRight } from 'lucide-react';
import { WrappedProvider, useWrapped, type WrappedData } from './context/WrappedContext';
import { WarpCanvas } from './components/WarpCanvas';
import { SlideContainer, SlideTitle, BigStat } from './components/SlideLayout';

// Importar slides existentes
const IntroSlide = () => {
  const { data } = useWrapped();
  return (
    <SlideContainer>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="text-8xl mb-8">
        🎁
      </motion.div>
      <SlideTitle>Retrospectiva {data?.year}</SlideTitle>
      <p className="text-white/60 text-xl">Vamos ver o que rolou no dominó.</p>
    </SlideContainer>
  );
};

const BaseStatsSlide = () => { 
  const { data } = useWrapped();
  const stats = data?.hooks.base.data;
  return (
    <SlideContainer>
      <SlideTitle>Seus Números</SlideTitle>
      <div className="grid grid-cols-2 gap-4">
        <BigStat label="Partidas" value={stats?.total_matches || 0} delay={0.1} />
        <BigStat label="Vitórias" value={stats?.total_wins || 0} delay={0.2} />
      </div>
      <div className="mt-4">
         <BigStat label="Aproveitamento" value={`${stats?.winrate || 0}%`} delay={0.3} />
      </div>
    </SlideContainer>
  );
};


const PersonaSlide = () => {
  const { data } = useWrapped();
  const p = data?.hooks.personas.data;
  
  let title = "O Jogador";
  let desc = "Equilibrado e focado.";
  let icon = "😐";

  if (p?.is_silent) { title = "O Ninja Silencioso"; desc = "Ganha sem fazer barulho."; icon = "🥷"; }
  else if (p?.is_stubborn) { title = "Cabeça Dura"; desc = "Insiste até ganhar (ou perder)."; icon = "🗿"; }
  else if (p?.is_invisible_mvp) { title = "MVP Invisível"; desc = "Carrega o time nas costas."; icon = "👻"; }

  return (
    <SlideContainer>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-9xl mb-6">{icon}</motion.div>
      <SlideTitle>Sua Vibe</SlideTitle>
      <h3 className="text-4xl font-bold text-white mb-2">{title}</h3>
      <p className="text-xl text-gray-300">{desc}</p>
    </SlideContainer>
  );
};


const generateSlidePreviews = (slides: React.ReactNode[]) => {
  // Em produção, você geraria screenshots reais
  // Aqui é um exemplo com placeholders
  return slides.map((slide, index) => ({
    id: `slide-${index}`,
    title: `Slide ${index + 1}`,
    thumbnail: `data:image/svg+xml;base64,${btoa(`
      <svg width="200" height="120" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="120" fill="#1e293b"/>
        <rect x="10" y="10" width="180" height="20" fill="#3b82f6" rx="4"/>
        <rect x="10" y="45" width="100" height="10" fill="#64748b" rx="2"/>
        <rect x="10" y="60" width="140" height="10" fill="#64748b" rx="2"/>
        <rect x="10" y="75" width="120" height="10" fill="#64748b" rx="2"/>
        <text x="100" y="105" text-anchor="middle" fill="white" font-family="Arial" font-size="14">
          Slide ${index + 1}
        </text>
      </svg>
    `)}`,
    selected: true
  }));
};

// Importar NOVOS slides (crie estes arquivos primeiro)
// Se preferir, pode colocar tudo no mesmo arquivo, mas é melhor separar
import { MonthlyActivitySlide } from './slides/MonthlyActivitySlide';
import { VictoryTypesSlide } from './slides/VictoryTypesSlide';
import { RankingsSlide } from './slides/RankingsSlide';
import { RivalrySlide } from './slides/RivalrySlide';
import { PerformanceGraphsSlide } from './slides/PerformanceGraphsSlide';
import { DuoSlide } from './slides/DuoSlide';
import { ComparisonsSlide } from './slides/ComparisonsSlide';
import { useWrappedComparisons } from '../wrapped/hooks/useWrappedComparisons';
import {StreaksSlide} from './slides/StreaksSlide'
import {FinalSlide} from './slides/FinalSlide'

// --- VIEWER PRINCIPAL ---

const WrappedViewer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { currentIndex, nextSlide, prevSlide, setPaused, isPaused, progress, setTotalSlides, data } = useWrapped();
  
  // Estado para controlar se mostra o FinalSlide
  const [showFinalScreen, setShowFinalScreen] = useState(false);
  
  // Estados para detectar gestos de swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;
  const comparisonsData = useWrappedComparisons(data?.year, data?.playerId)
  
  // MONTAGEM DOS SLIDES REGULARES (sem o FinalSlide)
  const slides = [
    // 1. Introdução
    <IntroSlide key="intro" />,
    
    // 2. Estatísticas básicas
    <BaseStatsSlide key="base" />,
    
    // 3. Atividade mensal (NOVO)
    data?.hooks.monthly?.timeline?.length > 0 ? <MonthlyActivitySlide key="monthly" /> : null,
    
    // 4. Tipos de vitória (NOVO)
    data?.hooks.victoryTypes?.data ? <VictoryTypesSlide key="victory" /> : null,
    
    // 5. Rankings (NOVO)
    data?.hooks.rankings?.ranking?.length > 0 ? <RankingsSlide key="rankings" /> : null,
    
    // 6. Sequências
    data?.hooks.streaks.data ? <StreaksSlide key="streaks" /> : null,
    
    // 7. Duplas
    data?.hooks.duos?.sorted ? <DuoSlide key="duo" sorted={data.hooks.duos.sorted} /> : null,
    
    // 8. Rivalidades
    data?.hooks.rivalries.data ? <RivalrySlide key="rival" /> : null,
    
    // 8.0.1 COMPARACAO
    <ComparisonsSlide key="comparisons" data={comparisonsData.data} loading={comparisonsData.loading}/>,
    
    // 8.1 Performance
    <PerformanceGraphsSlide key="performance" />,

    // 9. Persona
   // <PersonaSlide key="persona" />,
  ].filter(Boolean); // Remove slides nulos

  // Gerar prévias para o FinalSlide
  const slidePreviews = generateSlidePreviews(slides);

  // Quando chegar no último slide, mostrar tela final após um delay
  useEffect(() => {
    if (currentIndex === slides.length - 1 && progress >= 100 && !showFinalScreen) {
      const timer = setTimeout(() => {
        setShowFinalScreen(true);
      }, 1000); // 1 segundo após completar o último slide
      return () => clearTimeout(timer);
    }
  }, [currentIndex, progress, slides.length, showFinalScreen]);

  // Configurar total de slides
  useEffect(() => {
    setTotalSlides(slides.length);
    document.body.classList.add('wrapped-active');
    
    return () => {
      document.body.classList.remove('wrapped-active');
    };
  }, [slides.length, setTotalSlides]);

  // Handlers para gestos - desativar na tela final
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showFinalScreen) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (showFinalScreen) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (showFinalScreen) return;
    
    if (!touchStart || !touchEnd) {
      setPaused(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
    
    setPaused(false);
  };

  // Handler para clique - desativar na tela final
  const handleClick = (e: React.MouseEvent) => {
    if (showFinalScreen) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const third = rect.width / 3;
    
    if (clickX < third) {
      prevSlide();
    } else if (clickX > third * 2) {
      nextSlide();
    } else {
      setPaused(!isPaused);
    }
  };

  // Função para voltar do FinalScreen para o último slide
  const handleBackFromFinal = () => {
    setShowFinalScreen(false);
    setPaused(true); // Pausa para o usuário poder ver o último slide
  };

  // Se mostrar tela final
  if (showFinalScreen) {
    return (
      <div style={styles.overlay}>
        <WarpCanvas speedMultiplier={0} /> {/* Para animação das estrelas */}
        
        {/* Header simplificado - só botão de fechar */}
        <div style={{
          position: 'absolute',
          top: 'env(safe-area-inset-top, 20px)',
          right: '16px',
          zIndex: 1000,
        }}>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={20} color="#fff" />
          </button>
        </div>

        {/* Tela Final como overlay completo */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <FinalSlide 
            onClose={onClose} 
            slidePreviews={slidePreviews}
            onBack={handleBackFromFinal} // Adicione esta prop ao FinalSlide
          />
        </div>
      </div>
    );
  }

  // Renderização normal dos slides
  return (
    <div style={styles.overlay}>
      <WarpCanvas speedMultiplier={isPaused ? 0 : 1} />

      {/* Barra de Progresso - apenas para slides regulares */}
      <div style={styles.progressBar}>
        {slides.map((_, idx) => (
          <div key={idx} style={styles.progressSegment}>
            <motion.div 
              style={styles.progressFill}
              animate={{ 
                width: idx < currentIndex ? '100%' : 
                       idx === currentIndex ? `${progress}%` : '0%'
              }}
              transition={{ duration: 0.1 }}
            />
          </div>
        ))}
      </div>

      {/* Header com contador */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.navButton} onClick={prevSlide}>
            <ChevronLeft size={20} color="#fff" />
          </button>
          <span style={styles.counter}>
            {currentIndex + 1}/{slides.length}
          </span>
        </div>
        
        <button style={styles.closeButton} onClick={onClose}>
          <X size={20} color="#fff" />
        </button>
      </div>

      {/* Área principal de toque */}
      <div 
        style={styles.touchArea}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
      />

      {/* Container principal dos slides */}
      <div style={styles.slidesContainer}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={styles.slideWrapper}
          >
            {slides[currentIndex]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ícone de pause */}
      {isPaused && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={styles.pauseIndicator}
        >
          <Pause size={32} color="#fff" />
        </motion.div>
      )}

      {/* Instruções iniciais */}
      {currentIndex === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ 
            duration: 3,
            times: [0, 0.5, 1],
            repeat: 3
          }}
          style={styles.instructions}
        >
          <span>Toque para avançar</span>
          <ChevronRight size={16} />
        </motion.div>
      )}
    </div>
  );
};

// Estilos inline corrigidos
const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    background: '#000',
    zIndex: 9999,
  },
  progressBar: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    padding: '8px',
    display: 'flex',
    gap: '4px',
    zIndex: 1000,
    paddingTop: 'env(safe-area-inset-top, 8px)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  progressSegment: {
    flex: 1,
    height: '3px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: '2px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: '2px',
  },
  header: {
    position: 'absolute' as const,
    top: 'env(safe-area-inset-top, 20px)',
    left: 0,
    right: 0,
    padding: '0 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  navButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },
  counter: {
    fontWeight: 'bold' as const,
    fontSize: '14px',
    color: '#fff',
    opacity: 0.9,
    textShadow: '0 1px 3px rgba(0,0,0,0.5)',
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    backdropFilter: 'blur(10px)',
  },
  touchArea: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 50,
  },
  slidesContainer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
    padding: '20px',
    boxSizing: 'border-box' as const,
  },
  slideWrapper: {
    width: '100%',
    maxWidth: '800px',
    height: '100%',
    maxHeight: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIndicator: {
    position: 'absolute' as const,
    top: '87%',
    left: '45%',
    transform: 'translate(-50%, -50%)',
    zIndex: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    padding: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none' as const,
  },
  instructions: {
    position: 'absolute' as const,
    bottom: '40px',
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    zIndex: 70,
    pointerEvents: 'none' as const,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    color: 'rgba(255,255,255,0.8)',
    fontSize: '14px',
  },
};

export const WrappedStory: React.FC<{ data: WrappedData; onClose: () => void }> = (props) => (
  <WrappedProvider {...props}>
    <WrappedViewer onClose={props.onClose} />
  </WrappedProvider>
);