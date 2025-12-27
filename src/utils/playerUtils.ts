// src/utils/playerUtils.ts
import supabase from './supabase';
import { useEffect, useState, useCallback } from 'react';

export async function getPlayerNameById(playerId: string): Promise<string> {
  try {
    // Primeiro tenta buscar como DominoPlayer
    const { data: dominoPlayer } = await supabase
      .from('DominoPlayers')
      .select('display_name, user_id')
      .eq('id', playerId)
      .single();

    if (dominoPlayer?.display_name) {
      return dominoPlayer.display_name;
    }

    // Se não encontrar, busca o perfil do usuário
    if (dominoPlayer?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', dominoPlayer.user_id)
        .single();

      return profile?.full_name || 'Jogador';
    }

    // Busca em DominoMatchPlayers para convidados
    const { data: matchPlayer } = await supabase
      .from('DominoMatchPlayers')
      .select('guest_name')
      .eq('player_id', playerId)
      .not('guest_name', 'is', null)
      .single();

    if (matchPlayer?.guest_name) {
      return matchPlayer.guest_name;
    }

    return 'Jogador';
  } catch (error) {
    console.error('Erro ao buscar nome do jogador:', error);
    return 'Jogador';
  }
}

// Versão síncrona para uso nos slides
export function usePlayerNameCache() {
  const [cache, setCache] = useState<Record<string, string>>({});

  const getPlayerName = useCallback(async (playerId: string) => {
    if (cache[playerId]) {
      return cache[playerId];
    }

    const name = await getPlayerNameById(playerId);
    setCache(prev => ({ ...prev, [playerId]: name }));
    return name;
  }, [cache]);

  return { getPlayerName };
}