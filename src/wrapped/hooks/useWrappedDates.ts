// useWrappedDates.ts
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type DatesSummary = {
  dias_ativos: number;
  primeira_partida: string;
  ultima_partida: string;
};

export function useWrappedDates(playerId: string, year: number) {
  const [data, setData] = useState<DatesSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('vw_wrapped_dates_summary')
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