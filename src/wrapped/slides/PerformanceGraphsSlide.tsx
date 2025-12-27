import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { useWrapped } from '../context/WrappedContext';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import styles from './PerformanceGraphsSlide.module.css';

export function PerformanceGraphsSlide() {
  const { data } = useWrapped();
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    // Animação muito rápida para story de 5 segundos
    const t = setTimeout(() => setAnimationComplete(true), 300);
    return () => clearTimeout(t);
  }, []);

  if (!data?.hooks?.graphs?.winrate) {
    return (
      <SlideContainer>
        <SlideTitle>Evolução da Performance</SlideTitle>
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={styles.noData}
        >
          Dados de performance não disponíveis
        </motion.div>
      </SlideContainer>
    );
  }

  // Processar dados do winrate
  const winrateData = data.hooks.graphs.winrate
    .filter((item: any) => item.cumulative_winrate != null)
    .map((item: any, index: number) => ({
      name: `P${item.match_index}`,
      partida: item.match_index,
      winrate: Number(item.cumulative_winrate.toFixed(1)),
      index: index,
    }));

  if (winrateData.length === 0) {
    return (
      <SlideContainer>
        <SlideTitle>Evolução da Performance</SlideTitle>
        <div className={styles.noData}>
          Nenhum dado de winrate disponível
        </div>
      </SlideContainer>
    );
  }

  // Calcular estatísticas
  const primeiroValor = winrateData[0].winrate;
  const ultimoValor = winrateData[winrateData.length - 1].winrate;
  const variacao = ultimoValor - primeiroValor;
  const maiorValor = Math.max(...winrateData.map(d => d.winrate));
  const menorValor = Math.min(...winrateData.map(d => d.winrate));

  return (
    <SlideContainer>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }} // Muito rápido!
        className={styles.container}
      >
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <SlideTitle>Evolução do Performance</SlideTitle>
        </motion.div>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.2 }}
          className={styles.subtitle}
        >
          Como seu aproveitamento evoluiu ao longo das partidas
        </motion.p>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.2 }}
          className={styles.chartContainer}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={winrateData}
              margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            >
              <CartesianGrid 
                strokeDasharray="2 2" 
                stroke="rgba(255, 255, 255, 0.08)"
                vertical={false}
              />
              
              <XAxis 
                dataKey="name"
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                tickLine={false}
                tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }}
                interval="preserveStartEnd"
                minTickGap={10}
              />
              
              <YAxis 
                axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                tickLine={false}
                tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }}
                domain={[Math.max(0, Math.floor(menorValor) - 5), Math.min(100, Math.ceil(maiorValor) + 5)]}
                tickFormatter={(value) => `${value}%`}
                width={35}
              />
              
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) => [`${value}%`, 'Win Rate']}
                labelFormatter={(label) => `Partida ${label.replace('P', '')}`}
              />
              
              <Line
                type="monotone"
                dataKey="winrate"
                stroke="#22c55e"
                strokeWidth={2.5}
                dot={{ 
                  stroke: '#22c55e', 
                  strokeWidth: 1.5, 
                  r: 2.5, 
                  fill: '#000',
                  strokeOpacity: 0.8,
                }}
                activeDot={{ 
                  r: 4, 
                  stroke: '#fff', 
                  strokeWidth: 1.5, 
                  fill: '#22c55e' 
                }}
                isAnimationActive={true}
                animationDuration={800} // REDUZIDO de 1500 para 800ms
                animationEasing="ease-out"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Estatísticas - aparecem todas de uma vez */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: animationComplete ? 0.3 : 0.8, duration: 0.2 }}
          className={styles.statsContainer}
        >
          
          
          <div className={styles.statItem}>
            <div className={styles.statLabel}>Atual</div>
            <div className={styles.statValue}>{ultimoValor.toFixed(1)}%</div>
          </div>
          
          
        </motion.div>

        {/* Legenda */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: animationComplete ? 0.4 : 1, duration: 0.2 }}
          className={styles.legend}
        >
          Cada ponto representa o win rate acumulado após cada partida
        </motion.div>
      </motion.div>
    </SlideContainer>
  );
}

// Estilos inline para o tooltip
const tooltipStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.9)',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '6px',
  color: '#fff',
  backdropFilter: 'blur(10px)',
  padding: '8px 12px',
  fontSize: '11px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
};