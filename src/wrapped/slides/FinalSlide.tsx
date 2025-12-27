import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import { 
  Home, 
   
  ChevronLeft, 

  Heart,
  X
} from 'lucide-react';
import styles from './FinalSlide.module.css';

interface SlidePreview {
  id: string;
  title: string;
  thumbnail: string;
  selected: boolean;
}

interface FinalSlideProps {
  onClose: () => void;
  slidePreviews?: SlidePreview[];
  onBack?: () => void;
}

export const FinalSlide: React.FC<FinalSlideProps> = ({ onClose, slidePreviews = [], onBack }) => {
  const [selectedSlides, setSelectedSlides] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Inicializar com todos selecionados
  useEffect(() => {
    const allIds = slidePreviews.map(slide => slide.id);
    setSelectedSlides(allIds);
  }, [slidePreviews]);

  // REMOVA todo o useEffect que previne eventos
  // Isso está bloqueando os cliques!

  

  

 

  return (
    <div className={styles.finalSlideContainer}>
      <SlideContainer>
        <div className={styles.container}>
          {/* REMOVA um dos botões de fechar - fique apenas com o do header */}
          
          {/* Header de navegação */}
          <div className={styles.navigationHeader}>
            {onBack && (
              <button 
                className={styles.backButton}
                onClick={onBack}
              >
                <ChevronLeft size={20} />
                <span>Voltar</span>
              </button>
            )}
            
            <button 
              className={styles.closeButton}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={styles.header}
          >
            <SlideTitle>Fim da Retrospectiva! 🎉</SlideTitle>
            <p className={styles.subtitle}>
              Revise seus momentos de {new Date().getFullYear()} e salve suas memórias
            </p>
          </motion.div>

          {/* Carrossel */}
          
          

          {/* Ações */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={styles.actionsSection}
          >
            <div className={styles.actionsGrid}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={`${styles.actionButton} ${styles.homeButton}`}
              >
                <Home size={24} />
                <div className={styles.buttonText}>
                  <span className={styles.buttonTitle}>Voltar para Home</span>
                  <span className={styles.buttonSubtitle}>Encerrar retrospectiva</span>
                </div>
              </motion.button>
            </div>
          </motion.div>

          {/* Mensagem Final */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className={styles.finalMessage}
          >
            <Heart size={20} />
            <p>
              Obrigado por revisitar suas jogadas de {new Date().getFullYear()}. 
              Que {new Date().getFullYear() + 1} traga ainda mais vitórias! 🎮
            </p>
          </motion.div>

          {/* Instruções */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className={styles.instructions}
          >
            <p className={styles.instructionsText}>
             
            </p>
          </motion.div>
        </div>
      </SlideContainer>
    </div>
  );
};