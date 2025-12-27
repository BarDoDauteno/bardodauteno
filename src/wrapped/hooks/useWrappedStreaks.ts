import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';
type StreakStats = {
  best_win_streak: number | null;
  worst_lose_streak: number | null;
};

export function useWrappedStreaks(playerId: string, year: number) {
  const [data, setData] = useState<StreakStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('vw_wrapped_streaks_summary')
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
