import React from 'react';
import { motion } from 'framer-motion';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import styles from './ComparisonsSlide.module.css';
import { Trophy, TrendingUp, Zap, User, Users, Crown, BarChart3 } from 'lucide-react';

interface ComparisonData {
  player_winrate: number;
  avg_winrate: number;
  best_winrate: number;
  
  player_wins: number;
  avg_wins: number;
  best_wins: number;
  
  player_aura: number;
  avg_aura: number;
  best_aura: number;
  
  best_player_id: string;
}

interface ComparisonsSlideProps {
  data?: ComparisonData;
  loading?: boolean;
}

export function ComparisonsSlide({ data, loading = false }: ComparisonsSlideProps) {
  if (loading || !data) {
    return (
      <SlideContainer>
        <SlideTitle>Comparações</SlideTitle>
        <div className={styles.loading}>
          Carregando comparações...
        </div>
      </SlideContainer>
    );
  }

  // Calcular diferenças percentuais
  const winrateDiff = ((data.player_winrate - data.avg_winrate) / data.avg_winrate) * 100;
  const winsDiff = ((data.player_wins - data.avg_wins) / data.avg_wins) * 100;
  const auraDiff = ((data.player_aura - data.avg_aura) / data.avg_aura) * 100;

  // Determinar status baseado no desempenho
  const getComparisonStatus = (diff: number) => {
    if (diff > 20) return { 
      icon: <Trophy className={styles.icon} />, 
      color: '#f59e0b',
      label: 'Destaque',
      className: styles.highlight
    };
    if (diff > 10) return { 
      icon: <TrendingUp className={styles.icon} />, 
      color: '#10b981',
      label: 'Acima',
      className: styles.positive
    };
    if (diff > 0) return { 
      icon: <TrendingUp className={styles.icon} />, 
      color: '#22c55e',
      label: 'Melhor',
      className: styles.positive
    };
    if (diff < 0) return { 
      icon: <TrendingUp className={styles.icon} style={{ transform: 'rotate(180deg)' }} />, 
      color: '#ef4444',
      label: 'Abaixo',
      className: styles.negative
    };
    return { 
      icon: <BarChart3 className={styles.icon} />, 
      color: '#6b7280',
      label: 'Igual',
      className: styles.neutral
    };
  };

  const winrateStats = getComparisonStatus(winrateDiff);
  const winsStats = getComparisonStatus(winsDiff);
  const auraStats = getComparisonStatus(auraDiff);

  // Formatar IDs curtos
  const formatPlayerId = (id: string) => {
    if (!id) return 'N/A';
    return id.length > 10 ? `${id.substring(0, 8)}...` : id;
  };

  return (
    <SlideContainer>
      <div className={styles.wrapper}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={styles.container}
        >
          <div className={styles.header}>
            <SlideTitle>Comparações</SlideTitle>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.2 }}
              className={styles.subtitle}
            >
              Como você se compara com outros jogadores
            </motion.p>
          </div>

          {/* Cards de Comparação - 3 colunas */}
          <div className={styles.comparisonGrid}>
            {/* Win Rate */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.25 }}
              className={`${styles.comparisonCard} ${winrateStats.className}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper} style={{ color: winrateStats.color }}>
                  {winrateStats.icon}
                </div>
                <div className={styles.cardHeaderText}>
                  <h3 className={styles.cardTitle}>Win Rate</h3>
                  <div className={styles.cardStatus}>
                    <span className={styles.statusLabel} style={{ color: winrateStats.color }}>
                      {winrateStats.label}
                    </span>
                    <span className={`${styles.diffValue} ${winrateStats.className}`}>
                      {winrateDiff >= 0 ? '+' : ''}{winrateDiff.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={styles.comparisonRow}>
                <div className={styles.comparisonItem}>
                  <div className={styles.comparisonLabel}>
                    <User size={14} />
                    <span>Você</span>
                  </div>
                  <div className={styles.comparisonValue} style={{ color: winrateStats.color }}>
                    {data.player_winrate.toFixed(1)}%
                  </div>
                </div>
                
                <div className={styles.comparisonItem}>
                  <div className={styles.comparisonLabel}>
                    <Users size={14} />
                    <span>Média</span>
                  </div>
                  <div className={styles.comparisonValue}>
                    {data.avg_winrate.toFixed(1)}%
                  </div>
                </div>
                
                <div className={styles.comparisonItem}>
                  <div className={styles.comparisonLabel}>
                    <Crown size={14} />
                    <span>Melhor</span>
                  </div>
                  <div className={styles.comparisonValue}>
                    {data.best_winrate.toFixed(1)}%
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Vitórias */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.25 }}
              className={`${styles.comparisonCard} ${winsStats.className}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.cardIconWrapper} style={{ color: winsStats.color }}>
                  {winsStats.icon}
                </div>
                <div className={styles.cardHeaderText}>
                  <h3 className={styles.cardTitle}>Vitórias</h3>
                  <div className={styles.cardStatus}>
                    <span className={styles.statusLabel} style={{ color: winsStats.color }}>
                      {winsStats.label}
                    </span>
                    <span className={`${styles.diffValue} ${winsStats.className}`}>
                      {winsDiff >= 0 ? '+' : ''}{winsDiff.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className={styles.comparisonRow}>
                <div className={styles.comparisonItem}>
                  <div className={styles.comparisonLabel}>
                    <User size={14} />
                    <span>Você</span>
                  </div>
                  <div className={styles.comparisonValue} style={{ color: winsStats.color }}>
                    {data.player_wins}
                  </div>
                </div>
                
                <div className={styles.comparisonItem}>
                  <div className={styles.comparisonLabel}>
                    <Users size={14} />
                    <span>Média</span>
                  </div>
                  <div className={styles.comparisonValue}>
                    {data.avg_wins.toFixed(0)}
                  </div>
                </div>
                
                <div className={styles.comparisonItem}>
                  <div className={styles.comparisonLabel}>
                    <Crown size={14} />
                    <span>Melhor</span>
                  </div>
                  <div className={styles.comparisonValue}>
                    {data.best_wins}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Aura */}
            
          </div>

          {/* Resumo do Melhor Jogador */}
          

          {/* Legenda */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55, duration: 0.25 }}
            className={styles.legend}
          >
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#22c55e' }} />
              <span>Você</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#6b7280' }} />
              <span>Média</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }} />
              <span>Melhor</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </SlideContainer>
  );
}