import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type Comparison = {
  player_winrate: number;
  avg_winrate: number;
  best_winrate: number;

  player_wins: number;
  avg_wins: number;
  best_wins: number;

  player_aura: number;
  avg_aura: number;
  best_aura: number;

  best_player_id: string;
};

export function useWrappedComparisons(
  year: number,
  playerId: string
) {
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('vw_wrapped_comparisons')
        .select('*')
        .eq('year', year)
        .eq('player_id', playerId)
        .single();

      setData(data);
      setLoading(false);
    };

    fetch();
  }, [year, playerId]);

  return { data, loading };
}
