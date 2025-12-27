import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import { WrappedStory } from '../wrapped/WrappedStory';
import {
  useWrappedBase, useWrappedAura, useWrappedMonthlyActivity, useWrappedPersonas,
  useWrappedStreaks, useWrappedVictoryTypes, useWrappedDuos, useWrappedDuels,
  useWrappedRivalries, useWrappedGraphs, useWrappedRankings, useWrappedComparisons, useWrappedDates
} from '../wrapped/hooks/index';

const WrappedPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingStep, setLoadingStep] = useState('Autenticando...');
  const [dominoPlayerId, setDominoPlayerId] = useState<string | null>(null);
  const [readyData, setReadyData] = useState<any>(null);

  const [showWrapped, setShowWrapped] = useState(false);
  const [wrappedData, ] = useState(null);

  

  // 1. Buscar o ID do jogador de Dominó vinculado ao usuário
  useEffect(() => {
    const fetchPlayerId = async () => {
        if (!user) {
            navigate('/login'); // Redireciona se não estiver logado
            return;
        }

        setLoadingStep('Buscando perfil de jogador...');
        
        // Query baseada na estrutura da tabela que você forneceu
        const { data, error } = await supabase
            .from('DominoPlayers')
            .select('id')
            .eq('user_id', user.id)
            .single();

        if (error || !data) {
            console.error("Erro ao buscar jogador:", error);
            alert("Perfil de jogador de dominó não encontrado para este usuário.");
            navigate('/');
            return;
        }

        setDominoPlayerId(data.id);
        setLoadingStep('Carregando estatísticas...');
    };

    fetchPlayerId();
  }, [user, navigate]);
  
  // 2. Chamar os hooks APENAS quando tivermos o ID
  // Usamos um ano fixo ou dinâmico
  const year = 2025;
  const pid = dominoPlayerId || ''; // Evita chamar hooks com null, mas eles devem tratar string vazia

  const base = useWrappedBase(pid, year);
  const aura = useWrappedAura(pid, year);
  const monthly = useWrappedMonthlyActivity(pid, year);
  const personas = useWrappedPersonas(pid, year);
  const streaks = useWrappedStreaks(pid, year);
  const victoryTypes = useWrappedVictoryTypes(pid, year);
  const duos = useWrappedDuos(pid, year);
  const duels = useWrappedDuels(pid, year);
  const rivalries = useWrappedRivalries(pid, year);
  const graphs = useWrappedGraphs(pid, year);
  const rankings = useWrappedRankings(year);
  const comparisons = useWrappedComparisons(year, pid);
  const dates = useWrappedDates(pid, year);

  // 3. Monitorar carregamento de todos os hooks
  useEffect(() => {
    if (!dominoPlayerId) return;

    const hooks = [base, aura, monthly, personas, streaks, victoryTypes, duos, duels, rivalries, graphs, rankings, comparisons, dates];
    const allLoaded = hooks.every(h => !h.loading);

    if (allLoaded) {
        // Montar o objeto final
        setReadyData({
            playerId: dominoPlayerId,
            year,
            hooks: {
                base, aura, monthly, personas, streaks, victoryTypes, duos, duels, rivalries, graphs, rankings, comparisons, dates
            }
        });
    }
  }, [dominoPlayerId, base.loading, aura.loading, monthly.loading, /*... todos loading deps ...*/ personas.loading]);

  if (showWrapped && wrappedData) {
    return (
      <div style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999 
      }}>
        <WrappedStory 
          data={wrappedData} 
          onClose={() => {
            setShowWrapped(false);
            // Restaurar scroll do body
            document.body.style.overflow = 'auto';
          }} 
        />
      </div>
    );
  }

  if (!readyData) {
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h2 className="text-xl font-bold animate-pulse">{loadingStep}</h2>
            <p className="text-gray-500 text-sm mt-2">Calculando suas jogadas...</p>
        </div>
    );
  }



  return (
    <WrappedStory 
        data={readyData} 
        onClose={() => navigate('/')} 
    />
  );
};

export default WrappedPage;