import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type AuraStats = {
  total_aura: number;
  total_mogged: number;
  aura_balance: number;
  aura_per_match: number;
  mogged_per_match: number;
};

export function useWrappedAura(playerId: string, year: number) {
  const [data, setData] = useState<AuraStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('vw_wrapped_aura_summary')
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
