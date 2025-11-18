import React, { useEffect, useState } from 'react';
import supabase from '../utils/supabase';
import { Link } from 'react-router-dom';
import '../styles/DominoPage.css';
import { useAuth } from '../context/AuthContext';

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

// Novo tipo para período
type PeriodFilter = {
    type: 'all' | 'month' | 'custom';
    months: string[]; // formato: 'YYYY-MM'
    startDate?: string;
    endDate?: string;
};

export default function DominoPage() {
    const { user } = useAuth();
    const [matches, setMatches] = useState<DominoMatch[]>([]);
    const [filteredMatches, setFilteredMatches] = useState<DominoMatch[]>([]);
    const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
    const [duoStats, setDuoStats] = useState<DuoStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>('playerStats');
    const [sortBy, setSortBy] = useState<'wins' | 'winRate'>('wins');

    // Novos estados para filtros
    const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({ type: 'all', months: [] });
    const [availableMonths, setAvailableMonths] = useState<string[]>([]);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([]);

    // Função para extrair meses disponíveis das partidas
    const getAvailableMonths = (matchesData: DominoMatch[]) => {
        const monthsSet = new Set<string>();

        matchesData.forEach(match => {
            const date = new Date(match.match_date);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
            monthsSet.add(monthKey);
        });

        const monthsArray = Array.from(monthsSet).sort().reverse();
        setAvailableMonths(monthsArray);

        // Selecionar o mês atual por padrão
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        setSelectedMonths([currentMonth]);
        setPeriodFilter({
            type: monthsArray.length > 0 ? 'month' : 'all',
            months: [currentMonth]
        });
    };

    // Função para filtrar matches por período
    const filterMatchesByPeriod = (matchesData: DominoMatch[], period: PeriodFilter) => {
        if (period.type === 'all') {
            return matchesData;
        }

        return matchesData.filter(match => {
            const matchDate = new Date(match.match_date);
            const matchYear = matchDate.getFullYear();
            const matchMonth = matchDate.getMonth() + 1;
            const matchMonthKey = `${matchYear}-${matchMonth.toString().padStart(2, '0')}`;

            return period.months.includes(matchMonthKey);
        });
    };

    // Atualizar filtro quando selectedMonths mudar
    useEffect(() => {
        if (selectedMonths.length === 0) {
            setPeriodFilter({ type: 'all', months: [] });
            setFilteredMatches(matches);
        } else {
            setPeriodFilter({ type: 'month', months: selectedMonths });
            const filtered = filterMatchesByPeriod(matches, { type: 'month', months: selectedMonths });
            setFilteredMatches(filtered);
        }
    }, [selectedMonths, matches]);

    // Recalcular estatísticas quando filteredMatches mudar
    useEffect(() => {
        calculateStats(filteredMatches);
    }, [filteredMatches]);

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
            .limit(1000); // Aumentei o limite para pegar mais dados históricos

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
        setFilteredMatches(formatted);
        getAvailableMonths(formatted);
        setLoading(false);
    };

    const calculateStats = (matchesData: DominoMatch[]) => {
        const playerStatsMap = new Map<string, { wins: number; total: number }>();
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

                const isInRedTeam = match.duoRedNames.includes(playerName);
                const isInBlueTeam = match.duoBlueNames.includes(playerName);

                if ((isInRedTeam && match.winning_team === 1) ||
                    (isInBlueTeam && match.winning_team === 2)) {
                    playerStats.wins++;
                }
            });
        });

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

    // Funções para manipular seleção de meses
    const toggleMonthSelection = (monthKey: string) => {
        setSelectedMonths(prev => {
            if (prev.includes(monthKey)) {
                return prev.filter(m => m !== monthKey);
            } else {
                return [...prev, monthKey];
            }
        });
    };

    const selectAllMonths = () => {
        setSelectedMonths([...availableMonths]);
    };

    const clearMonthSelection = () => {
        setSelectedMonths([]);
    };

    const selectCurrentMonth = () => {
        const currentDate = new Date();
        const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
        setSelectedMonths([currentMonth]);
    };

    // Função para formatar o nome do mês
    const formatMonthName = (monthKey: string) => {
        const [year, month] = monthKey.split('-');
        const monthNames = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

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
                <h1>DOMINO DO DAUTENO</h1>
                {user && (
                    <Link to="/domino/create"><button className="create-match-btn">➕ Criar partida</button></Link>
                )}
            </header>

            {/* Filtro de Período - NOVO */}
            <div className="period-filter-section">
                <h3 className="filter-title">Filtrar por período:</h3>

                <div className="period-controls">
                    <button
                        className={`period-btn ${selectedMonths.length === 0 ? 'active' : ''}`}
                        onClick={clearMonthSelection}
                    >
                        📊 Todos os meses
                    </button>
                    <button
                        className="period-btn"
                        onClick={selectCurrentMonth}
                    >
                        🗓️ Mês atual
                    </button>
                    <button
                        className="period-btn"
                        onClick={selectAllMonths}
                    >
                        ⭐ Todos selecionados
                    </button>
                </div>

                <div className="months-grid">
                    {availableMonths.map(monthKey => (
                        <button
                            key={monthKey}
                            className={`month-chip ${selectedMonths.includes(monthKey) ? 'selected' : ''}`}
                            onClick={() => toggleMonthSelection(monthKey)}
                        >
                            {formatMonthName(monthKey)}
                            {selectedMonths.includes(monthKey) && ' ✓'}
                        </button>
                    ))}
                </div>

                {selectedMonths.length > 0 && (
                    <div className="selected-info">
                        <strong>Período selecionado:</strong> {selectedMonths.length} mês(es) -
                        {selectedMonths.map(monthKey => formatMonthName(monthKey)).join(', ')}
                    </div>
                )}
            </div>

            {/* Controles de visualização existentes */}
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

            {/* Visualização de Partidas (agora usa filteredMatches) */}
            {viewMode === 'matches' && !loading && (
                <div className="matches-section">
                    <div className="matches-header">
                        <h3>Partidas {selectedMonths.length > 0 ? `(${selectedMonths.length} mês(es) selecionado(s))` : '(Todos os meses)'}</h3>
                        <span className="matches-count">{filteredMatches.length} partidas</span>
                    </div>
                    <ul className="matches-list">
                        {filteredMatches.length === 0 && <li className="no-matches">Nenhuma partida encontrada para o período selecionado.</li>}
                        {filteredMatches.map(m => (
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
                </div>
            )}

            {/* Estatísticas de Jogadores */}
            {viewMode === 'playerStats' && !loading && (
                <div className="stats-container">
                    <div className="stats-header">
                        <h3 className="stats-title">
                            RANKING DE JOGADORES
                        </h3>
                    </div>
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
                    <div className="stats-header">
                        <h3 className="stats-title">
                            Ranking de Duplas
                            {selectedMonths.length > 0 && ` - ${selectedMonths.length} mês(es) selecionado(s)`}
                        </h3>
                        <span className="stats-count">{sortedDuoStats.length} duplas</span>
                    </div>
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