
import { motion } from 'framer-motion';
import { useWrapped } from '../context/WrappedContext';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import { Flame, Snowflake, TrendingUp, TrendingDown, Zap, Timer } from 'lucide-react';
import styles from './StreaksSlide.module.css';

export const StreaksSlide = () => {
  const { data } = useWrapped();
  const streaks = data?.hooks.streaks?.data;

  if (!streaks) {
    return (
      <SlideContainer>
        <SlideTitle>Sequências</SlideTitle>
        <div className={styles.loading}>
          <Zap size={32} />
          <p>Carregando estatísticas de sequências...</p>
        </div>
      </SlideContainer>
    );
  }

  const bestWinStreak = streaks.best_win_streak || 0;
  const worstLoseStreak = streaks.worst_lose_streak || 0;
  const currentStreak = streaks.current_streak || 0;
  const isWinningStreak = currentStreak >= 0;
  
  // Calcular porcentagem do melhor streak em relação ao máximo teórico
  const maxPossibleStreak = Math.max(20, bestWinStreak * 1.5);
  const winStreakPercentage = Math.min((bestWinStreak / maxPossibleStreak) * 100, 100);
  const loseStreakPercentage = Math.min((worstLoseStreak / maxPossibleStreak) * 100, 100);

  return (
    <SlideContainer>
      <div className={styles.container}>
        <SlideTitle>Sequências</SlideTitle>
        
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={styles.subtitle}
        >
          Suas melhores e piores marcas consecutivas
        </motion.p>

        <div className={styles.streaksGrid}>
          {/* Melhor Streak de Vitórias */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className={`${styles.streakCard} ${styles.winStreak}`}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Flame size={24} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>🔥 Melhor Sequência</h3>
                <p className={styles.cardSubtitle}>Mais vitórias consecutivas</p>
              </div>
            </div>
            
            <div className={styles.streakValueContainer}>
              <span className={styles.streakValue}>{bestWinStreak}</span>
              <span className={styles.streakLabel}>vitórias</span>
            </div>
            
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill}
                style={{ width: `${winStreakPercentage}%` }}
              />
              <div className={styles.progressLabels}>
                <span>0</span>
                <span>{maxPossibleStreak}+</span>
              </div>
            </div>
            
            <div className={styles.cardFooter}>
              {bestWinStreak >= 10 ? '🔥 Dominância total!' : 
               bestWinStreak >= 5 ? '🎯 Impressionante!' : 
               '💪 Boa sequência!'}
            </div>
          </motion.div>

          {/* Pior Seca */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className={`${styles.streakCard} ${styles.loseStreak}`}
          >
            <div className={styles.cardHeader}>
              <div className={styles.cardIcon}>
                <Snowflake size={24} />
              </div>
              <div>
                <h3 className={styles.cardTitle}>❄️ Pior Seca</h3>
                <p className={styles.cardSubtitle}>Mais derrotas consecutivas</p>
              </div>
            </div>
            
            <div className={styles.streakValueContainer}>
              <span className={styles.streakValue}>{worstLoseStreak}</span>
              <span className={styles.streakLabel}>derrotas</span>
            </div>
            
            <div className={styles.progressBar}>
              <div 
                className={`${styles.progressFill} ${styles.loseProgress}`}
                style={{ width: `${loseStreakPercentage}%` }}
              />
              <div className={styles.progressLabels}>
                <span>0</span>
                <span>{maxPossibleStreak}+</span>
              </div>
            </div>
            
            <div className={styles.cardFooter}>
              {worstLoseStreak >= 10 ? '🌧️ Tempo difícil...' : 
               worstLoseStreak >= 5 ? '🌪️ Fase complicada' : 
               '🌤️ Nada grave!'}
            </div>
          </motion.div>

          {/* Streak Atual */}
          

          {/* Estatísticas Adicionais */}
          
        </div>

        {/* Legenda */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className={styles.legend}
        >
          <p className={styles.legendText}>
            Streaks mostram sua consistência e resiliência durante o ano
          </p>
        </motion.div>
      </div>
    </SlideContainer>
  );
};