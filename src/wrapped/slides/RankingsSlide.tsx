import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Trophy, Target, TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

import { useWrapped } from '../context/WrappedContext';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import styles from './RankingsSlide.module.css';

/* =========================
   BLOCO ESTÁVEL DE GRÁFICO
========================= */
const ChartBlock: React.FC<{
  title: string;
  height?: number;
  children: React.ReactNode;
}> = ({ title, height = 180, children }) => (
  <div className={styles.chartContainer}>
    <h3 className={styles.chartTitle}>{title}</h3>
    <div className={styles.chartWrapper} style={{ height }}>
      {children}
    </div>
  </div>
);

export const RankingsSlide: React.FC = () => {
  const { data } = useWrapped();

  if (!data) return null;

  const rankings = data.hooks.rankings?.ranking ?? [];
  const winrateRaw = data.hooks.winrateProgress ?? [];
  const positionsRaw = data.hooks.matchPositions ?? [];

  if (rankings.length === 0) return null;

  const currentPlayer = rankings.find(
    p => p.player_id === data.playerId
  );

  const playerPosition = currentPlayer
    ? rankings.indexOf(currentPlayer) + 1
    : null;

  const getMedal = (pos: number) => {
    if (pos === 1) return '🥇';
    if (pos === 2) return '🥈';
    if (pos === 3) return '🥉';
    return `${pos}º`;
  };

  /* =========================
     TRANSFORMAÇÃO REAL DOS DADOS
  ========================= */

  const winrateData = winrateRaw
    .slice(0, 25)
    .map((p: any) => ({
      match: p.match_index,
      winrate: p.winrate_progress / 100,
    }));

  const positionData = positionsRaw
    .slice(0, 25)
    .map((p: any) => ({
      match: p.match_index,
      position: p.position,
    }));

  return (
    <SlideContainer>
      <div className={styles.root}>
        <SlideTitle>Ranking do Ano</SlideTitle>

        {/* ===== DESTAQUE ===== */}
        {currentPlayer && playerPosition && (
          <motion.div
            className={styles.highlightCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.highlightContent}>
              <div>
                <div className={styles.highlightHeader}>
                  <Crown size={18} className={styles.crownIcon} />
                  <span>Sua posição</span>
                </div>

                <div className={styles.highlightPosition}>
                  {playerPosition}º Lugar
                </div>

                <div className={styles.highlightMeta}>
                  {currentPlayer.wins} vitórias • {currentPlayer.winrate}% winrate
                </div>
              </div>

              <div className={styles.highlightMedal}>
                {getMedal(playerPosition)}
              </div>
            </div>
          </motion.div>
        )}

        {/* ===== TOP 5 ===== */}
        <div className={styles.listWrapper}>
          <h3 className={styles.listTitle}>Top 5 do Ano</h3>

          {rankings.slice(0, 5).map((player, idx) => {
            const isCurrent =
              player.player_id === data.playerId;

            return (
              <motion.div
                key={player.player_id}
                className={
                  isCurrent
                    ? styles.rankItemActive
                    : styles.rankItem
                }
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.12 }}
              >
                <div className={styles.rankLeft}>
                  <div className={styles.rankPosition}>
                    {getMedal(idx + 1)}
                  </div>

                  <div>
                    <div className={styles.rankName}>
                      {player.player_name}
                      {isCurrent && (
                        <span className={styles.currentDot} />
                      )}
                    </div>
                    <div className={styles.rankWins}>
                      {player.wins} vitórias
                    </div>
                  </div>
                </div>

                <div className={styles.rankRight}>
                  <div className={styles.rankWinrate}>
                    {player.winrate}%
                  </div>
                  <div className={styles.rankLabel}>winrate</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ===== 📈 MATCH x WINRATE ===== */}
        {winrateData.length > 0 && (
          <ChartBlock title="Evolução do Winrate">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={winrateData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="match" hide />
                <YAxis
                  domain={[0, 1]}
                  tickFormatter={v => `${Math.round(v * 100)}%`}
                />
                <Tooltip
                  formatter={(v: number) =>
                    `${Math.round(v * 100)}%`
                  }
                  labelFormatter={l => `Partida ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="winrate"
                  stroke="#facc15"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>
        )}

        {/* ===== 📊 MATCH x POSITION ===== */}
        {positionData.length > 0 && (
          <ChartBlock title="Posição por Partida" height={160}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={positionData}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="match" hide />
                <YAxis
                  reversed
                  domain={[1, 2]}
                  ticks={[1, 2]}
                  tickFormatter={v => `${v}º`}
                />
                <Tooltip
                  formatter={(v: number) => `${v}º lugar`}
                  labelFormatter={l => `Partida ${l}`}
                />
                <Line
                  type="stepAfter"
                  dataKey="position"
                  stroke="#60a5fa"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartBlock>
        )}

        {/* ===== STATS ===== */}
        <div className={styles.statsGrid}>
          <div className={styles.stat}>
            <Trophy size={20} className={styles.statIconGold} />
            <div className={styles.statValue}>
              {rankings[0]?.wins ?? 0}
            </div>
            <div className={styles.statLabel}>Líder</div>
          </div>

          <div className={styles.stat}>
            <Target size={20} className={styles.statIconGreen} />
            <div className={styles.statValue}>
              {rankings.length}
            </div>
            <div className={styles.statLabel}>Jogadores</div>
          </div>

          <div className={styles.stat}>
            <TrendingUp size={20} className={styles.statIconBlue} />
            <div className={styles.statValue}>
              {Math.round(
                rankings.reduce((s, p) => s + p.winrate, 0) /
                  rankings.length
              )}
              %
            </div>
            <div className={styles.statLabel}>Média</div>
          </div>
        </div>
      </div>
    </SlideContainer>
  );
};
