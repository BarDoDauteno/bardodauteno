import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import supabase from '../../utils/supabase';
import '../../styles/Home.css'
type PlayerStats = {
    name: string;
    wins: number;
    totalMatches: number;
    winRate: number;
};

export default function DominoRanking() {
    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
    const [loading, setLoading] = useState(true);

    const cleanName = (name: string) => {
        if (!name) return 'Convidado';
        return name.replace(/@gmail\.com$/i, '');
    };

    const fetchRanking = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('DominoMatches')
                .select(`
                    id,
                    winning_team,
                    DominoMatchPlayers (
                        team,
                        player_id,
                        guest_name,
                        DominoPlayers (
                            display_name
                        )
                    )
                `)
                .order('match_date', { ascending: false })
                .limit(100);

            if (error) throw error;

            const matches = data || [];
            const playerStatsMap = new Map<string, { wins: number; total: number }>();

            // Função auxiliar melhorada
            const getPlayerName = (player: any) => {
                const name = player.DominoPlayers?.display_name || player.guest_name || '';
                return cleanName(name);
            };

            matches.forEach((match: any) => {
                const matchPlayers = match.DominoMatchPlayers || [];

                // FILTRA jogadores com nome válido
                const validPlayers = matchPlayers.filter((p: any) => {
                    const playerName = getPlayerName(p);
                    return playerName !== 'Convidado' && playerName.trim() !== '';
                });

                // Se não houver jogadores válidos suficientes (menos de 4), ignora a partida
                if (validPlayers.length < 4) {
                    return; // Pula esta partida
                }

                const teamRed = validPlayers.filter((p: any) => p.team === 1)
                    .map((p: any) => getPlayerName(p));
                const teamBlue = validPlayers.filter((p: any) => p.team === 2)
                    .map((p: any) => getPlayerName(p));

                // Se algum time não tiver 2 jogadores, ignora a partida
                if (teamRed.length !== 2 || teamBlue.length !== 2) {
                    return;
                }

                // Processar jogadores individuais
                [...teamRed, ...teamBlue].forEach(playerName => {
                    if (!playerStatsMap.has(playerName)) {
                        playerStatsMap.set(playerName, { wins: 0, total: 0 });
                    }
                    const playerStats = playerStatsMap.get(playerName)!;
                    playerStats.total++;

                    // Verificar se o jogador estava no time vencedor
                    const isInRedTeam = teamRed.includes(playerName);
                    const isInBlueTeam = teamBlue.includes(playerName);

                    if ((isInRedTeam && match.winning_team === 1) ||
                        (isInBlueTeam && match.winning_team === 2)) {
                        playerStats.wins++;
                    }
                });
            });

            // Converter para array e ordenar por vitórias
            const playerStatsArray: PlayerStats[] = Array.from(playerStatsMap.entries())
                .map(([name, stats]) => ({
                    name,
                    wins: stats.wins,
                    totalMatches: stats.total,
                    winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
                }))
                .sort((a, b) => b.wins - a.wins)
                .slice(0, 5); // Top 5 apenas

            setPlayerStats(playerStatsArray);
        } catch (error) {
            console.error('Erro ao buscar ranking:', error);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchRanking();
    }, []);

    if (loading) {
        return (
            <aside className="ranking glass-box">
                <h2>Ranking Dominó</h2>
                <p>Carregando...</p>
            </aside>
        );
    }

    return (
        <aside className="ranking glass-box">
            <h2>🏆 Ranking Dominó</h2>

            {playerStats.length === 0 ? (
                <p>Nenhuma partida registrada</p>
            ) : (
                <div className="simplified-ranking">
                    {playerStats.map((player, index) => (
                        <div key={player.name} className={`ranking-item ${index < 3 ? 'podium' : ''}`}>
                            <div className="ranking-position">
                                {index === 0 ? '🥇' :
                                    index === 1 ? '🥈' :
                                        index === 2 ? '🥉' :
                                            `#${index + 1}`}
                            </div>
                            <div className="ranking-player">
                                <div className="player-name">{player.name}</div>
                                <div className="player-stats">
                                    {player.wins}W • {player.winRate.toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="ranking-footer">
                <Link to="/domino" className="view-full-ranking">
                    Ver ranking completo →
                </Link>
            </div>
        </aside>
    );
}