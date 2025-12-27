// hooks/useWrappedBase.ts
import { useState, useEffect } from 'react';
import supabase from '../../utils/supabase';

export const useWrappedBase = (playerId: string, year: number) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetchData = async () => {
    // VERIFICAÇÃO CRÍTICA: Não buscar se playerId estiver vazio
    if (!playerId || playerId.trim() === '') {
      setLoading(false);
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data: result, error } = await supabase
        .from('vw_wrapped_base_stats')
        .select('*')
        .eq('player_id', playerId)
        .eq('year', year)
        .single();

      if (error) {
        console.error('Erro ao buscar dados base:', error);
        setError(error);
        setData(null);
      } else {
        setData(result);
      }
    } catch (err) {
      console.error('Erro ao buscar dados base:', err);
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [playerId, year]);

  return { data, loading, error, refetch: fetchData };
};