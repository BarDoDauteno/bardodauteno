import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';
type Personas = {
  is_silent: boolean;
  is_stubborn: boolean;
  is_invisible_mvp: boolean;
};

export function useWrappedPersonas(playerId: string, year: number) {
  const [data, setData] = useState<Personas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('vw_wrapped_personas')
        .select('is_silent, is_stubborn, is_invisible_mvp')
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
