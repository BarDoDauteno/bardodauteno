import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

export function useWrappedGraphs(playerId: string, year: number) {
  const [positions, setPositions] = useState<any[]>([]);
  const [winrate, setWinrate] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId || !year) return;
    const fetch = async () => {
      setLoading(true);
      const [posRes, winRes] = await Promise.all([
        supabase.from('vw_wrapped_match_positions').select('*').eq('player_id', playerId).eq('year', year).order('match_index'),
        supabase.from('vw_wrapped_winrate_progress').select('*').eq('player_id', playerId).eq('year', year).order('match_index')
      ]);
      setPositions(posRes.data || []);
      setWinrate(winRes.data || []);
      setLoading(false);
    };
    fetch();
  }, [playerId, year]);

  return { positions, winrate, loading };
}