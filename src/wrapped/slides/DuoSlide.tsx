// components/wrapped/slides/DuoSlide.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { Users, Trophy, Skull, Flame, TrendingDown } from 'lucide-react';
import { useWrapped } from '../context/WrappedContext';
import { SlideContainer, SlideTitle } from '../components/SlideLayout';
import './DuoSlide.css';

type Duo = {
  player_id: string;
  player_name: string;
  partner_id: string;
  partner_name: string;
  year: number;
  games_together: number;
  wins_together: number;
  losses_together: number;
  winrate: number;
};

const itemAnim = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0 }
};

const Card = ({
  title,
  duo,
  icon,
  accent,
  footer
}: {
  title: string;
  duo?: Duo;
  icon: React.ReactNode;
  accent: string;
  footer?: string;
}) => {
  if (!duo) {
    return (
      <motion.div
        className={`duo-card ${accent} empty-card`}
        variants={itemAnim}
      >
        <div className="duo-icon">{icon}</div>
        <h3>{title}</h3>
        <div className="duo-names">
          <span>Nenhuma dupla</span>
        </div>
        <div className="duo-stats">
          <div>
            <strong>0</strong>
            <span>Jogos</span>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`duo-card ${accent}`}
      variants={itemAnim}
    >
      <div className="duo-icon">{icon}</div>
      <h3>{title}</h3>
      <div className="duo-names">
        <span>{duo.player_name}</span>
        <span className="duo-sep">+</span>
        <span>{duo.partner_name}</span>
      </div>
      <div className="duo-stats">
        <div>
          <strong>{duo.games_together}</strong>
          <span>Jogos</span>
        </div>
        <div>
          <strong>{duo.wins_together}</strong>
          <span>Vitórias</span>
        </div>
        <div>
          <strong>{duo.losses_together}</strong>
          <span>Derrotas</span>
        </div>
      </div>
      {footer && (
        <div className="duo-footer">
          {footer}
        </div>
      )}
    </motion.div>
  );
};

export const DuoSlide = () => {
  const { data } = useWrapped();
  
  console.log('🔍 DuoSlide data:', {
    duos: data?.hooks?.duos,
    sorted: data?.hooks?.duos?.sorted,
    loading: data?.hooks?.duos?.loading
  });

  const sorted = data?.hooks?.duos?.sorted;
  
  if (!sorted) {
    return (
      <SlideContainer>
        <SlideTitle>Suas Duplas em Destaque</SlideTitle>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="duo-empty-message"
        >
          <Users size={48} />
          <p>Carregando estatísticas de duplas...</p>
        </motion.div>
      </SlideContainer>
    );
  }

  // Verificar se há algum dado
  const hasAnyData = Object.values(sorted).some(Boolean);

  if (!hasAnyData) {
    return (
      <SlideContainer>
        <SlideTitle>Suas Duplas em Destaque</SlideTitle>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="duo-empty-message"
        >
          <Users size={48} />
          <p>Nenhuma dupla encontrada para este ano</p>
          <small>Jogue mais partidas em equipe para ver suas estatísticas!</small>
        </motion.div>
      </SlideContainer>
    );
  }

  return (
    <SlideContainer>
      <motion.section
        className="duo-slide"
        initial="hidden"
        animate="show"
        transition={{ staggerChildren: 0.12 }}
      >
        <SlideTitle>Suas Duplas em Destaque</SlideTitle>

        <div className="duo-grid">
          <Card
            title="Dupla Mais Jogada"
            duo={sorted.mostPlayed}
            icon={<Users size={28} />}
            accent="blue"
          />

          <Card
            title="Mais Vitórias"
            duo={sorted.mostWins}
            icon={<Trophy size={28} />}
            accent="green"
          />

          <Card
            title="Mais Derrotas"
            duo={sorted.mostLosses}
            icon={<Skull size={28} />}
            accent="red"
          />

          <Card
            title="Melhor Winrate"
            duo={sorted.bestDuo}
            icon={<Flame size={28} />}
            accent="gold"
            footer={`Winrate: ${((sorted.bestDuo?.winrate || 0)).toFixed(1)}%`}
          />

          <Card
            title="Pior Winrate"
            duo={sorted.worstDuo}
            icon={<TrendingDown size={28} />}
            accent="purple"
            footer={`Winrate: ${((sorted.worstDuo?.winrate || 0)).toFixed(1)}%`}
          />
        </div>
      </motion.section>
    </SlideContainer>
  );
};