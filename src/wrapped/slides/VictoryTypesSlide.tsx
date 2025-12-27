import React from 'react';
import { motion } from 'framer-motion';
import { useWrapped } from '../context/WrappedContext';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import './VictoryTypesSlide.css';

export const VictoryTypesSlide: React.FC = () => {
  const { data } = useWrapped();
  const victoryData = data?.hooks?.victoryTypes?.data;

  if (!victoryData) return null;

  const totalWins =
    (victoryData.wins_bucha || 0) +
    (victoryData.wins_contagem || 0) +
    (victoryData.wins_lasque || 0);

  const totalLosses =
    (victoryData.losses_bucha || 0) +
    (victoryData.losses_contagem || 0) +
    (victoryData.losses_lasque || 0);

  const victoryTypes = [
    {
      name: 'Bucha',
      emoji: '💥',
      wins: victoryData.wins_bucha || 0,
      losses: victoryData.losses_bucha || 0,
      gradient: 'gradient-red',
    },
    {
      name: 'Contagem',
      emoji: '🧮',
      wins: victoryData.wins_contagem || 0,
      losses: victoryData.losses_contagem || 0,
      gradient: 'gradient-blue',
    },
    {
      name: 'Lasque',
      emoji: '🃏',
      wins: victoryData.wins_lasque || 0,
      losses: victoryData.losses_lasque || 0,
      gradient: 'gradient-green',
    },
  ];

  const mostCommonVictory = victoryTypes.reduce((max, type) =>
    type.wins > max.wins ? type : max
  );

  return (
    <SlideContainer>
      <SlideTitle>Estilos de Jogo</SlideTitle>

      {/* ===== HIGHLIGHT ===== */}
      <div className="victory-highlight">
        <div className="victory-emoji">{mostCommonVictory.emoji}</div>
        <p className="victory-subtitle">
          Você venceu mais por{' '}
          <span>{mostCommonVictory.name}</span>
        </p>
        <p className="victory-count">
          {mostCommonVictory.wins} vitórias
        </p>
      </div>

      {/* ===== LISTA ===== */}
      <div className="victory-list">
        {victoryTypes.map((type, idx) => {
          const winRate =
            totalWins > 0
              ? Math.round((type.wins / totalWins) * 100)
              : 0;

          return (
            <motion.div
              key={type.name}
              className="victory-card"
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.15 }}
            >
              <div className="victory-header">
                <div className="victory-title">
                  <span>{type.emoji}</span>
                  <strong>{type.name}</strong>
                </div>

                <div className="victory-number">
                  <strong>{type.wins}</strong>
                  <span>vitórias</span>
                </div>
              </div>

              <div className="victory-bars">
                <div className="bar-group">
                  <span className="win">✓ {type.wins}</span>
                  <div className="bar">
                    <motion.div
                      className={`bar-fill ${type.gradient}`}
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(type.wins / totalWins) * 100 || 0}%`,
                      }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>

                <div className="bar-group">
                  <span className="loss">✗ {type.losses}</span>
                  <div className="bar">
                    <motion.div
                      className="bar-fill gradient-loss"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${(type.losses / totalLosses) * 100 || 0}%`,
                      }}
                      transition={{ duration: 1 }}
                    />
                  </div>
                </div>
              </div>

              <div className="victory-rate">
                {winRate}% das vitórias
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ===== TOTAL ===== */}
      <div className="victory-summary">
        <div>
          <strong className="win">{totalWins}</strong>
          <span>Vitórias</span>
        </div>
        <div>
          <strong className="loss">{totalLosses}</strong>
          <span>Derrotas</span>
        </div>
      </div>
    </SlideContainer>
  );
};
