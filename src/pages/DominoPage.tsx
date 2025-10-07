import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabase';
import { Link } from 'react-router-dom';
import '../styles/DominoPage.css';

type DominoMatch = {
    id: number;
    match_date: string;
    winning_team: number;
    comments: string;
    duoRed: string;
    duoBlue: string;
    duoRedNames: string[];
    duoBlueNames: string[];
};

type PlayerStats = {
    name: string;
    wins: number;
    totalMatches: number;
    winRate: number;
};

type DuoStats = {
    duo: string;
    players: string[];
    wins: number;
    totalMatches: number;
    winRate: number;
};

type ViewMode = 'matches' | 'playerStats' | 'duoStats';

export default function DominoPage() {
    const [matches, setMatches] = useState<DominoMatch[]>([]);
    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
    const [duoStats, setDuoStats] = useState<DuoStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('matches');
    const [sortBy, setSortBy] = useState<'wins' | 'winRate'>('wins');

    // Função para remover @gmail.com dos nomes
    const cleanName = (name: string) => {
        if (!name) return 'Convidado';
        return name.replace(/@gmail\.com$/i, '');
    };

    const fetchMatches = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('DominoMatches')
            .select(`
                id,
                match_date,
                winning_team,
                comments,
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

        if (error) {
            console.error(error);
            setLoading(false);
            return;
        }

        const formatted = (data || []).map((m: any) => {
            const teamRed = m.DominoMatchPlayers.filter((p: any) => p.team === 1)
                .map((p: any) => cleanName(p.DominoPlayers?.display_name || p.guest_name || 'Convidado'));
            const teamBlue = m.DominoMatchPlayers.filter((p: any) => p.team === 2)
                .map((p: any) => cleanName(p.DominoPlayers?.display_name || p.guest_name || 'Convidado'));

            return {
                ...m,
                duoRed: `(${teamRed.join(', ')})`,
                duoBlue: `(${teamBlue.join(', ')})`,
                duoRedNames: teamRed,
                duoBlueNames: teamBlue,
            };
        });

        setMatches(formatted);
        calculateStats(formatted);
        setLoading(false);
    };

    const calculateStats = (matchesData: DominoMatch[]) => {
        // Estatísticas de jogadores individuais
        const playerStatsMap = new Map<string, { wins: number; total: number }>();

        // Estatísticas de duplas
        const duoStatsMap = new Map<string, { players: string[]; wins: number; total: number }>();

        matchesData.forEach(match => {
            // Processar time vermelho
            const redDuoKey = match.duoRedNames.sort().join(' & ');
            if (!duoStatsMap.has(redDuoKey)) {
                duoStatsMap.set(redDuoKey, {
                    players: match.duoRedNames,
                    wins: 0,
                    total: 0
                });
            }
            const redDuoStats = duoStatsMap.get(redDuoKey)!;
            redDuoStats.total++;
            if (match.winning_team === 1) {
                redDuoStats.wins++;
            }

            // Processar time azul
            const blueDuoKey = match.duoBlueNames.sort().join(' & ');
            if (!duoStatsMap.has(blueDuoKey)) {
                duoStatsMap.set(blueDuoKey, {
                    players: match.duoBlueNames,
                    wins: 0,
                    total: 0
                });
            }
            const blueDuoStats = duoStatsMap.get(blueDuoKey)!;
            blueDuoStats.total++;
            if (match.winning_team === 2) {
                blueDuoStats.wins++;
            }

            // Processar jogadores individuais
            [...match.duoRedNames, ...match.duoBlueNames].forEach(playerName => {
                if (!playerStatsMap.has(playerName)) {
                    playerStatsMap.set(playerName, { wins: 0, total: 0 });
                }
                const playerStats = playerStatsMap.get(playerName)!;
                playerStats.total++;

                // Verificar se o jogador estava no time vencedor
                const isInRedTeam = match.duoRedNames.includes(playerName);
                const isInBlueTeam = match.duoBlueNames.includes(playerName);

                if ((isInRedTeam && match.winning_team === 1) ||
                    (isInBlueTeam && match.winning_team === 2)) {
                    playerStats.wins++;
                }
            });
        });

        // Converter map para arrays e calcular win rate
        const playerStatsArray: PlayerStats[] = Array.from(playerStatsMap.entries()).map(([name, stats]) => ({
            name,
            wins: stats.wins,
            totalMatches: stats.total,
            winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
        }));

        const duoStatsArray: DuoStats[] = Array.from(duoStatsMap.entries()).map(([duo, stats]) => ({
            duo,
            players: stats.players,
            wins: stats.wins,
            totalMatches: stats.total,
            winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0
        }));

        setPlayerStats(playerStatsArray);
        setDuoStats(duoStatsArray);
    };

    useEffect(() => {
        fetchMatches();
    }, []);

    const getMatchTitle = (match: DominoMatch) => {
        const redTeam = match.duoRedNames.length > 0 ? match.duoRedNames.join(' & ') : 'Dupla Vermelha';
        const blueTeam = match.duoBlueNames.length > 0 ? match.duoBlueNames.join(' & ') : 'Dupla Azul';
        return `${redTeam} vs ${blueTeam}`;
    };

    const sortedPlayerStats = [...playerStats].sort((a, b) => {
        return sortBy === 'wins' ? b.wins - a.wins : b.winRate - a.winRate;
    });

    const sortedDuoStats = [...duoStats].sort((a, b) => {
        return sortBy === 'wins' ? b.wins - a.wins : b.winRate - a.winRate;
    });

    return (
        <div className="domino-page-container">
            <header className="domino-header">
                <h1>Partidas de Dominó</h1>
                <Link to="/domino/create"><button className="create-match-btn">➕ Criar partida</button></Link>
            </header>

            {/* Controles de visualização - NOVA VERSÃO */}
            <div className="view-controls">
                <div className="filter-section">
                    <h3 className="filter-title">Visualizar:</h3>
                    <div className="filter-buttons">
                        <button
                            className={`filter-btn ${viewMode === 'matches' ? 'active' : ''}`}
                            onClick={() => setViewMode('matches')}
                        >
                            📋 Partidas
                        </button>
                        <button
                            className={`filter-btn ${viewMode === 'playerStats' ? 'active' : ''}`}
                            onClick={() => setViewMode('playerStats')}
                        >
                            👤 Jogadores
                        </button>
                        <button
                            className={`filter-btn ${viewMode === 'duoStats' ? 'active' : ''}`}
                            onClick={() => setViewMode('duoStats')}
                        >
                            👥 Duplas
                        </button>
                    </div>
                </div>

                {(viewMode === 'playerStats' || viewMode === 'duoStats') && (
                    <div className="sort-section">
                        <h3 className="filter-title">Ordenar por:</h3>
                        <div className="filter-buttons">
                            <button
                                className={`filter-btn ${sortBy === 'wins' ? 'active' : ''}`}
                                onClick={() => setSortBy('wins')}
                            >
                                🏆 Vitórias
                            </button>
                            <button
                                className={`filter-btn ${sortBy === 'winRate' ? 'active' : ''}`}
                                onClick={() => setSortBy('winRate')}
                            >
                                📈 Win Rate
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {loading ? <p className="loading-text">Carregando...</p> : null}

            {/* Visualização de Partidas */}
            {viewMode === 'matches' && !loading && (
                <ul className="matches-list">
                    {matches.length === 0 && <li className="no-matches">Nenhuma partida registrada.</li>}
                    {matches.map(m => (
                        <li key={m.id} className="match-item">
                            <div className="match-content">
                                <div className="match-info">
                                    <strong className="match-title">{getMatchTitle(m)}</strong>
                                    <div className="match-meta">
                                        #{m.id} — {new Date(m.match_date).toLocaleString()}
                                    </div>
                                    {m.comments && (
                                        <div className="match-comments">
                                            {m.comments}
                                        </div>
                                    )}
                                    <div className="match-winner">
                                        Vencedor: {m.winning_team === 0 ? 'Empate' : m.winning_team === 1 ? 'Vermelho' : 'Azul'}
                                    </div>
                                </div>
                                <div className="match-actions">
                                    <Link to={`/domino/${m.id}`}><button className="view-btn">Ver</button></Link>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {/* Estatísticas de Jogadores */}
            {viewMode === 'playerStats' && !loading && (
                <div className="stats-container">
                    <h3 className="stats-title">Ranking de Jogadores</h3>
                    <table className="stats-table">
                        <thead>
                            <tr className="table-header">
                                <th className="position-col">Posição</th>
                                <th className="name-col">Jogador</th>
                                <th className="stats-col">Vitórias</th>
                                <th className="stats-col">Partidas</th>
                                <th className="stats-col">Win Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedPlayerStats.map((player, index) => (
                                <tr key={player.name} className="table-row">
                                    <td className="position-cell">{index + 1}</td>
                                    <td className="name-cell">{player.name}</td>
                                    <td className="stats-cell">{player.wins}</td>
                                    <td className="stats-cell">{player.totalMatches}</td>
                                    <td className="stats-cell win-rate-cell">
                                        {player.winRate.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Estatísticas de Duplas */}
            {viewMode === 'duoStats' && !loading && (
                <div className="stats-container">
                    <h3 className="stats-title">Ranking de Duplas</h3>
                    <table className="stats-table">
                        <thead>
                            <tr className="table-header">
                                <th className="position-col">Posição</th>
                                <th className="name-col">Dupla</th>
                                <th className="stats-col">Vitórias</th>
                                <th className="stats-col">Partidas</th>
                                <th className="stats-col">Win Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedDuoStats.map((duo, index) => (
                                <tr key={duo.duo} className="table-row">
                                    <td className="position-cell">{index + 1}</td>
                                    <td className="name-cell">{duo.duo}</td>
                                    <td className="stats-cell">{duo.wins}</td>
                                    <td className="stats-cell">{duo.totalMatches}</td>
                                    <td className="stats-cell win-rate-cell">
                                        {duo.winRate.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}