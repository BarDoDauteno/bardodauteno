import React from 'react';
import { motion } from 'framer-motion';
import { Sword, Zap, ShieldAlert, Trophy } from 'lucide-react';
import { useWrapped } from '../context/WrappedContext';
import { SlideContainer } from '../components/SlideLayout';
import styles from './RivalrySlide.module.css';

export const RivalrySlide: React.FC = () => {
  const { data } = useWrapped();
  const rival = data?.hooks.rivalries.data;

  if (!rival) return null;

  const rivalName = rival.biggest_rival_name || 'Grande Rival';
  const winRate =
    rival.games_count > 0
      ? Math.round((rival.wins_count / rival.games_count) * 100)
      : 0;

  return (
    <SlideContainer>
      <div className={styles.root}>

        {/* AURA DE FUNDO */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity }}
          className={styles.aura}
        />

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className={styles.header}
        >
          <span>Confronto Direto</span>
        </motion.div>

        {/* VS ICON */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12, delay: 0.2 }}
          className={styles.vsWrapper}
        >
          <div className={styles.vsIcon}>
            <Zap size={40} className={styles.vsIconSvg} />
          </div>

          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={styles.vsPulse}
          />
        </motion.div>

        {/* TEXTO DO RIVAL */}
        <div className={styles.rivalText}>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={styles.subtitle}
          >
            Seu maior oponente foi
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', delay: 0.5 }}
            className={styles.rivalName}
          >
            {rivalName}
          </motion.h2>
        </div>

        {/* CARD */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={styles.card}
        >
          <div className={styles.cardHeader}>
            <div>
              <p className={styles.cardLabel}>Partidas</p>
              <p className={styles.cardValue}>{rival.games_count}</p>
            </div>
            <Sword size={20} className={styles.swordIcon} />
          </div>

          {/* PROGRESS */}
          <div className={styles.progressWrapper}>
            <div className={styles.progressHeader}>
              <span>Taxa de Vitória</span>
              <span
                className={
                  winRate >= 50 ? styles.winPositive : styles.winNegative
                }
              >
                {winRate}%
              </span>
            </div>

            <div className={styles.progressBar}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${winRate}%` }}
                transition={{ duration: 1.5, delay: 1, ease: 'circOut' }}
                className={
                  winRate >= 50
                    ? styles.progressFillWin
                    : styles.progressFillLose
                }
              />
            </div>
          </div>
        </motion.div>

        {/* FOOTER */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className={styles.footer}
        >
          {winRate >= 50 ? (
            <>
              <Trophy size={14} />
              <span>Você dominou a mesa</span>
            </>
          ) : (
            <>
              <ShieldAlert size={14} />
              <span>Ele foi um desafio real</span>
            </>
          )}
        </motion.div>
      </div>
    </SlideContainer>
  );
};
