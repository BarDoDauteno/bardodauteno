// hooks/useWrappedMonthlyActivity.ts (CORRIGIDO)
import { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';

type MonthlyActivity = {
  month: number;
  matches_in_month: number;
};

export function useWrappedMonthlyActivity(playerId: string, year: number) {
  const [timeline, setTimeline] = useState<MonthlyActivity[]>([]);
  const [topMonth, setTopMonth] = useState<MonthlyActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Não fazer fetch se playerId estiver vazio
      if (!playerId || !year) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Timeline
        const { data: monthly, error: monthlyError } = await supabase
          .from('vw_wrapped_monthly_activity')
          .select('month, matches_in_month')
          .eq('player_id', playerId)
          .eq('year', year)
          .order('month', { ascending: true });

        if (monthlyError) {
          console.error('Erro ao buscar timeline:', monthlyError);
          setError(monthlyError.message);
          setTimeline([]);
        } else {
          setTimeline(monthly || []);
          
          // Mês mais jogado - usar .maybeSingle() em vez de .single()
          if (monthly && monthly.length > 0) {
            const { data: best } = await supabase
              .from('vw_wrapped_monthly_activity')
              .select('month, matches_in_month')
              .eq('player_id', playerId)
              .eq('year', year)
              .order('matches_in_month', { ascending: false })
              .limit(1)
              .maybeSingle(); // <- Use maybeSingle aqui
            
            setTopMonth(best || null);
          } else {
            setTopMonth(null);
          }
        }
      } catch (err: any) {
        console.error('Erro no hook useWrappedMonthlyActivity:', err);
        setError(err.message);
        setTimeline([]);
        setTopMonth(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [playerId, year]);

  return { timeline, topMonth, loading, error };
}