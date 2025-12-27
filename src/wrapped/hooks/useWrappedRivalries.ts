import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

// Definição da interface para facilitar o uso no Intellisense/Autocomplete
export interface WrappedRivalryData {
  year: number;
  player_id: string;
  biggest_rival_id: string;
  biggest_rival_name: string; // Novo campo da View
  games_count: number;
  nemesis_id: string;
  nemesis_name: string;      // Novo campo da View
  losses_count: number;
  victim_id: string;
  victim_name: string;       // Novo campo da View
  wins_count: number;
}

export function useWrappedRivalries(playerId: string, year: number) {
  const [data, setData] = useState<WrappedRivalryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    // Só executa se tivermos os parâmetros necessários
    if (!playerId || !year) {
      setLoading(false);
      return;
    }

    const fetchRivalries = async () => {
      setLoading(true);
      try {
        const { data: result, error: supabaseError } = await supabase
          .from('vw_wrapped_rivalries')
          .select('*')
          .eq('player_id', playerId)
          .eq('year', year)
          .maybeSingle();

        if (supabaseError) throw supabaseError;

        setData(result);
      } catch (err) {
        console.error('Erro ao buscar rivalidades:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRivalries();
  }, [playerId, year]); // Removido name_Player pois o ID já é suficiente para disparar o fetch

  return { data, loading, error };
}