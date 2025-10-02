import { useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function TestSupabase() {
    useEffect(() => {
        const testConnection = async () => {
            const { data, error } = await supabase.from('Posts').select('*').limit(5);

            if (error) {
                console.error('Erro ao puxar dados do Supabase:', error);
            } else {
                console.log('Dados puxados do Supabase:', data);
                alert(JSON.stringify(data, null, 2)); // só para teste
            }
        };

        testConnection();
    }, []);

    return <div className="p-6">Testando conexão com Supabase... Abra o console do navegador.</div>;
}
