// hooks/useWrappedDuos.ts
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type Duo = {
  player_id: string;
  player_name: string;
  partner_id: string;
  partner_name: string;
  year: number;
  games_together: number;
  wins_together: number;
  losses_together: number;
  winrate: number; // 0–1
};

export function useWrappedDuos(playerId: string, year: number) {
  const [duos, setDuos] = useState<Duo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDuos = async () => {
      if (!playerId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        console.log('🔍 Fetching duos for player:', playerId, 'year:', year);
        
        // Primeiro, vamos buscar os dados da view
        const { data, error: fetchError } = await supabase
          .from('vw_wrapped_duos_summary')
          .select('*')
          .eq('player_id', playerId)
          .eq('year', year);

        console.log('📊 Raw data from view:', data);

        if (fetchError) {
          console.error('❌ Error fetching duos:', fetchError);
          setError(fetchError.message);
          return;
        }

        // Se não houver dados, vamos tentar uma query direta
        if (!data || data.length === 0) {
          console.log('⚠️ No data from view, trying direct query...');
          const directData = await fetchDuosDirectly(playerId, year);
          setDuos(directData);
        } else {
          setDuos(data || []);
        }

      } catch (err) {
        console.error('💥 Unexpected error:', err);
        setError('Failed to fetch duos data: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchDuos();
  }, [playerId, year]);

  // Sort logic
  const sortedByGames = [...duos].sort(
    (a, b) => b.games_together - a.games_together
  );

  const sortedByWins = [...duos].sort(
    (a, b) => b.wins_together - a.wins_together
  );

  const sortedByLosses = [...duos].sort(
    (a, b) => b.losses_together - a.losses_together
  );

  const sortedByBestWinrate = [...duos]
    .filter(d => d.games_together >= 5)
    .sort((a, b) => b.winrate - a.winrate);

  const sortedByWorstWinrate = [...duos]
    .filter(d => d.games_together >= 5)
    .sort((a, b) => a.winrate - b.winrate);

  const sorted = {
    mostPlayed: sortedByGames[0],
    mostWins: sortedByWins[0],
    mostLosses: sortedByLosses[0],
    bestDuo: sortedByBestWinrate[0],
    worstDuo: sortedByWorstWinrate[0],
  };

  console.log('🎯 Sorted duos data:', sorted);

  return { duos, sorted, loading, error };
}

// Função alternativa se a view não funcionar
async function fetchDuosDirectly(playerId: string, year: number): Promise<Duo[]> {
  try {
    // Query direta usando suas tabelas reais
    const { data, error } = await supabase
      .from('DominoMatches')
      .select(`
        id,
        match_date,
        winning_team,
        match_players:DominoMatchPlayers(
          id,
          player_id,
          team,
          player:player_id(
            id,
            display_name
          )
        )
      `)
      .gte('match_date', `${year}-01-01`)
      .lt('match_date', `${year + 1}-01-01`)
      .order('match_date', { ascending: true });

    if (error) {
      console.error('Error in direct query:', error);
      return [];
    }

    // Processar os dados manualmente
    const duosMap = new Map<string, Duo>();

    data?.forEach(match => {
      const players = match.match_players || [];
      
      // Agrupar por time
      const team1 = players.filter(p => p.team === 1);
      const team2 = players.filter(p => p.team === 2);
      
      // Processar duplas do time 1
      if (team1.length === 2) {
        const [player1, player2] = team1;
        if (player1.player_id === playerId || player2.player_id === playerId) {
          const partnerId = player1.player_id === playerId ? player2.player_id : player1.player_id;
          const partnerName = player1.player_id === playerId 
            ? player2.player?.display_name 
            : player1.player?.display_name;
          
          const key = `${playerId}-${partnerId}`;
          const isWin = match.winning_team === 1;
          
          if (!duosMap.has(key)) {
            duosMap.set(key, {
              player_id: playerId,
              player_name: '', // Será preenchido depois
              partner_id: partnerId,
              partner_name: partnerName || `Jogador ${partnerId?.slice(0, 8)}`,
              year,
              games_together: 0,
              wins_together: 0,
              losses_together: 0,
              winrate: 0
            });
          }
          
          const duo = duosMap.get(key)!;
          duo.games_together++;
          if (isWin) {
            duo.wins_together++;
          } else {
            duo.losses_together++;
          }
        }
      }
      
      // Processar duplas do time 2 (mesma lógica)
      if (team2.length === 2) {
        const [player1, player2] = team2;
        if (player1.player_id === playerId || player2.player_id === playerId) {
          const partnerId = player1.player_id === playerId ? player2.player_id : player1.player_id;
          const partnerName = player1.player_id === playerId 
            ? player2.player?.display_name 
            : player1.player?.display_name;
          
          const key = `${playerId}-${partnerId}`;
          const isWin = match.winning_team === 2;
          
          if (!duosMap.has(key)) {
            duosMap.set(key, {
              player_id: playerId,
              player_name: '',
              partner_id: partnerId,
              partner_name: partnerName || `Jogador ${partnerId?.slice(0, 8)}`,
              year,
              games_together: 0,
              wins_together: 0,
              losses_together: 0,
              winrate: 0
            });
          }
          
          const duo = duosMap.get(key)!;
          duo.games_together++;
          if (isWin) {
            duo.wins_together++;
          } else {
            duo.losses_together++;
          }
        }
      }
    });

    // Calcular winrate para cada duo
    const result = Array.from(duosMap.values()).map(duo => ({
      ...duo,
      winrate: duo.games_together > 0 ? duo.wins_together / duo.games_together : 0
    }));

    console.log('📈 Processed duos directly:', result);
    return result;

  } catch (err) {
    console.error('Error processing duos directly:', err);
    return [];
  }
}