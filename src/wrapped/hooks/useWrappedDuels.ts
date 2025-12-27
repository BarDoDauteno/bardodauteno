// useWrappedDuels.ts
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type Duel = {
  year: number;
  player_id: string;
  opponent_id: string;
  games: number;
  wins: number;
  losses: number;
};

export function useWrappedDuels(playerId: string, year: number) {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('vw_wrapped_duels')
        .select('*')
        .eq('player_id', playerId)
        .eq('year', year);

      if (!error) {
        setDuels(data || []);
      }
      setLoading(false);
    };

    fetchData();
  }, [playerId, year]);

  return { duels, loading };
}