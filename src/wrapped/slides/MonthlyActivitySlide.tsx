import React from 'react';
import { motion } from 'framer-motion';
import { useWrapped } from '../context/WrappedContext';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import styles from './MonthlyActivitySlide.module.css';

export const MonthlyActivitySlide: React.FC = () => {
  const { data } = useWrapped();
  const monthly = data?.hooks.monthly;

  if (!monthly?.timeline || monthly.timeline.length === 0) return null;

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
  ];

  const topMonth =
    monthly.topMonth ||
    monthly.timeline.reduce((max, curr) =>
      curr.matches_in_month > max.matches_in_month ? curr : max
    );

  const maxMatches = Math.max(
    ...monthly.timeline.map(m => m.matches_in_month)
  );

  return (
    <SlideContainer>
      <div className={styles.root}>
        <SlideTitle>Atividade Mensal</SlideTitle>

        {/* MÊS EM DESTAQUE */}
        <div className={styles.highlight}>
          <p className={styles.highlightLabel}>
            Seu mês mais produtivo
          </p>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className={styles.highlightValue}
          >
            {monthNames[topMonth.month - 1]} •{' '}
            {topMonth.matches_in_month} partidas
          </motion.div>
        </div>

        {/* GRÁFICO */}
        <div className={styles.chart}>
          {monthly.timeline.map((month, idx) => {
            const heightPercent =
              (month.matches_in_month / maxMatches) * 100;

            const isTopMonth = month.month === topMonth.month;

            return (
              <motion.div
                key={month.month}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={styles.barItem}
              >
                <div className={styles.monthLabel}>
                  {monthNames[month.month - 1]}
                </div>

                <div className={styles.barContainer}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPercent}%` }}
                    transition={{
                      delay: idx * 0.1 + 0.3,
                      duration: 0.8,
                    }}
                    className={
                      isTopMonth
                        ? styles.barFillTop
                        : styles.barFill
                    }
                  />
                </div>

                <div className={styles.barValue}>
                  {month.matches_in_month}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* FOOTER */}
        <p className={styles.footer}>
          Total de meses ativos: {monthly.timeline.length}
        </p>
      </div>
    </SlideContainer>
  );
};
