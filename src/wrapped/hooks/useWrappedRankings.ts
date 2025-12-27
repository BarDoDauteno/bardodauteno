import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type Ranking = {
  player_id: string;
  wins: number;
  winrate: number;
  aura_total: number;
  rank_wins: number;
  rank_winrate: number;
  rank_aura: number;
};

export function useWrappedRankings(year: number) {
  const [ranking, setRanking] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('vw_wrapped_rankings')
        .select('*')
        .eq('year', year);

      setRanking(data || []);
      setLoading(false);
    };

    fetch();
  }, [year]);

  return { ranking, loading };
}
