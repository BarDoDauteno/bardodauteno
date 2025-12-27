// useWrappedVictoryTypes.ts
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type VictoryTypes = {
  wins_bucha: number;
  wins_contagem: number;
  wins_lasque: number;
  losses_bucha: number;
  losses_contagem: number;
  losses_lasque: number;
};

export function useWrappedVictoryTypes(playerId: string, year: number) {
  const [data, setData] = useState<VictoryTypes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('vw_wrapped_victory_types')
        .select('*')
        .eq('player_id', playerId)
        .eq('year', year)
        .single();

      if (!error) setData(data);
      setLoading(false);
    };

    fetchData();
  }, [playerId, year]);

  return { data, loading };
}