import React, { useEffect, useState, useRef } from 'react';
import supabase from '../../utils/supabase';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import * as d3 from 'd3';
import '../../styles/Analytics.css';

// -------------------- TYPES --------------------
type MatchPlayerRow = {
    id: number;
    match_id: number;
    player_id?: string | null;
    guest_name?: string | null;
    team: number;
    created_at?: string;
    // O Supabase pode retornar um objeto ou array dependendo da query, ajustamos aqui para aceitar flexibilidade
    DominoPlayers?: { id: string; display_name: string } | { id: string; display_name: string }[] | null;
};

type MatchRow = {
    id: number;
    match_date: string;
    winning_team: number;
    comments?: string | null;
    DominoMatchPlayers?: MatchPlayerRow[];
};

type PlayerRow = {
    id: string;
    user_id?: string | null;
    display_name: string;
    created_at?: string;
};

// -------------------- MAIN COMPONENT --------------------
export default function DominoAnalytics() {
    const [loading, setLoading] = useState(true);

    // KPIs
    const [kpis, setKpis] = useState({ totalMatches: 0, totalPlayers: 0, pctGuests: 0 });
    const [socialKPIs, setSocialKPIs] = useState({ totalPosts: 0, totalComments: 0, topPosts: [] as any[] });

    // Chart Data States
    const [seriesMatchesByDay, setSeriesMatchesByDay] = useState<any[]>([]);
    const [seriesMatchesByHour, setSeriesMatchesByHour] = useState<any[]>([]);
    const [seriesMatchesByWeekday, setSeriesMatchesByWeekday] = useState<any[]>([]);

    // Estavam faltando serem usados no JSX anterior:
    const [newPlayersByMonth, setNewPlayersByMonth] = useState<any[]>([]);
    const [playerExperienceHist, setPlayerExperienceHist] = useState<any[]>([]);

    const [playerRankings, setPlayerRankings] = useState<any[]>([]);
    const [playerWinRates, setPlayerWinRates] = useState<any[]>([]);
    const [duoTop, setDuoTop] = useState<any[]>([]);
    const [streaksHistorical, setStreaksHistorical] = useState<any[]>([]);
    const [heatmapHourlyWeek, setHeatmapHourlyWeek] = useState<number[][]>([]);

    // Network Graph Data
    const [coPlayMatrix, setCoPlayMatrix] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
    const networkRef = useRef<HTMLDivElement | null>(null);

    // Helper: Limpar nomes
    const cleanName = (name?: string | null) => {
        if (!name) return 'Convidado';
        return name.replace(/@.+$/, '').trim();
    };

    // Helper seguro para pegar nome do DominoPlayers (lidando com array ou objeto)
    const getPlayerName = (mp: MatchPlayerRow) => {
        if (mp.guest_name) return mp.guest_name;
        if (!mp.DominoPlayers) return 'Convidado';
        if (Array.isArray(mp.DominoPlayers)) {
            return mp.DominoPlayers[0]?.display_name || 'Convidado';
        }
        return mp.DominoPlayers.display_name || 'Convidado';
    };

    useEffect(() => {
        fetchAll();
    }, []);

    async function fetchAll() {
        setLoading(true);
        try {
            // 1. Buscar Partidas e Jogadores
            const { data: matchesData, error: matchesError } = await supabase
                .from('DominoMatches')
                .select(`
          id, match_date, winning_team, comments, created_at,
          DominoMatchPlayers (
            id, match_id, player_id, guest_name, team, created_at,
            DominoPlayers (id, display_name)
          )
        `)
                .order('match_date', { ascending: true });

            if (matchesError) throw matchesError;

            const { data: playersData, error: playersError } = await supabase
                .from('DominoPlayers')
                .select(`id, user_id, display_name, created_at`);

            if (playersError) throw playersError;

            // 2. Buscar Social (Tipagem explícita para corrigir erro 'implicit any')
            let posts: any[] = [], comments: any[] = [], interactions: any[] = [];

            try {
                const [pRes, cRes, iRes] = await Promise.all([
                    supabase.from('Posts').select('id, title, created_at, user_id'),
                    supabase.from('PostComments').select('id, post_id, user_id, created_at'),
                    supabase.from('PostInteractions').select('id, post_id, user_id, aurapost, mogged, created_at')
                ]);
                posts = pRes.data || [];
                comments = cRes.data || [];
                interactions = iRes.data || [];
            } catch (err) {
                console.warn("Tabelas sociais não encontradas ou erro de permissão.", err);
            }

            // Correção de Tipo: Usamos 'as unknown as MatchRow[]' para forçar a compatibilidade
            // pois sabemos que a estrutura retornada pelo Supabase bate com nossa lógica
            processAll(
                (matchesData || []) as unknown as MatchRow[],
                (playersData || []) as unknown as PlayerRow[],
                posts,
                comments,
                interactions
            );

        } catch (err) {
            console.error('Erro crítico analytics:', err);
        } finally {
            setLoading(false);
        }
    }

    function processAll(matchesRows: MatchRow[], playersRows: PlayerRow[], posts: any[], comments: any[], interactions: any[]) {
        // --- PREPARAÇÃO DE DADOS ---
        const totalMatches = matchesRows.length;
        const pmap = new Map<string, any>();

        const ensurePlayer = (name: string) => {
            if (!pmap.has(name)) {
                pmap.set(name, {
                    name, wins: 0, total: 0, currentStreak: 0, maxStreak: 0, matches: []
                });
            }
            return pmap.get(name)!;
        };

        const coMatrix = new Map<string, Map<string, number>>();
        const addCo = (a: string, b: string) => {
            if (a === b) return;
            if (!coMatrix.has(a)) coMatrix.set(a, new Map());
            const row = coMatrix.get(a)!;
            row.set(b, (row.get(b) || 0) + 1);
        };

        const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
        const duoMap = new Map<string, { wins: number; total: number }>();

        let guestAppearanceCount = 0;
        let totalSlots = 0;

        // --- LOOP PRINCIPAL ---
        matchesRows.forEach((m) => {
            const date = new Date(m.match_date);
            const day = date.getDay();
            const hour = date.getHours();
            heat[day][hour] = (heat[day][hour] || 0) + 1;

            // Identificar jogadores usando o helper seguro
            const team1Players = (m.DominoMatchPlayers || []).filter(mp => mp.team === 1);
            const team2Players = (m.DominoMatchPlayers || []).filter(mp => mp.team === 2);

            const team1Names = team1Players.map(mp => cleanName(getPlayerName(mp)));
            const team2Names = team2Players.map(mp => cleanName(getPlayerName(mp)));
            const allNames = [...team1Names, ...team2Names];

            totalSlots += (m.DominoMatchPlayers || []).length;
            (m.DominoMatchPlayers || []).forEach(mp => {
                if (!mp.player_id) guestAppearanceCount++;
            });

            // Rede de Conexões
            for (let i = 0; i < allNames.length; i++) {
                for (let j = i + 1; j < allNames.length; j++) {
                    addCo(allNames[i], allNames[j]);
                    addCo(allNames[j], allNames[i]);
                }
            }

            // Stats Individuais
            allNames.forEach(name => {
                const stat = ensurePlayer(name);
                stat.total++;
                const isTeam1 = team1Names.includes(name);
                const didWin = (isTeam1 && m.winning_team === 1) || (!isTeam1 && m.winning_team === 2);

                if (didWin) {
                    stat.wins++;
                    stat.currentStreak++;
                } else {
                    if (stat.currentStreak > stat.maxStreak) stat.maxStreak = stat.currentStreak;
                    stat.currentStreak = 0;
                }
            });

            // Duplas
            const processDuo = (names: string[], teamId: number) => {
                if (names.length === 2) {
                    const duoKey = names.sort().join(' & ');
                    if (!duoMap.has(duoKey)) duoMap.set(duoKey, { wins: 0, total: 0 });
                    const d = duoMap.get(duoKey)!;
                    d.total++;
                    if (m.winning_team === teamId) d.wins++;
                }
            };
            processDuo(team1Names, 1);
            processDuo(team2Names, 2);
        });

        // --- PÓS-PROCESSAMENTO ---
        const playersArray = Array.from(pmap.values());

        // 1. KPIs & Séries
        setKpis({
            totalMatches,
            totalPlayers: playersRows.length,
            pctGuests: totalSlots > 0 ? Math.round((guestAppearanceCount / totalSlots) * 100) : 0
        });

        const byDay = d3.rollups(matchesRows, v => v.length, m => (new Date(m.match_date)).toISOString().slice(0, 10))
            .map(([date, matches]) => ({ date, matches }))
            .sort((a, b) => a.date.localeCompare(b.date));

        const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, matches: 0 }));
        matchesRows.forEach(m => hourBuckets[new Date(m.match_date).getHours()].matches++);

        const weekdayBuckets = Array.from({ length: 7 }, (_, w) => ({ weekday: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][w], count: 0 }));
        matchesRows.forEach(m => weekdayBuckets[new Date(m.match_date).getDay()].count++);

        // 2. Novos Jogadores por Mês (Estava faltando ser usado)
        const newPlayersMap = d3.rollups(playersRows, v => v.length, p => (p.created_at ? new Date(p.created_at).toISOString().slice(0, 7) : 'Antigo'))
            .map(([month, count]) => ({ month, count }))
            .sort((a, b) => a.month.localeCompare(b.month));

        // 3. Histograma de Experiência (Estava faltando ser usado)
        // Agrupa jogadores por faixas de quantidade de jogos (ex: 1-5 jogos, 6-10 jogos)
        const xpBuckets = [1, 5, 10, 20, 50, 100];
        const xpHist = xpBuckets.map((limit, i) => {
            const prev = i === 0 ? 0 : xpBuckets[i - 1];
            const count = playersArray.filter(p => p.total > prev && p.total <= limit).length;
            return { range: `${prev + 1}-${limit}`, count };
        });
        // Adiciona os que tem mais que o ultimo bucket
        const hugeXp = playersArray.filter(p => p.total > 100).length;
        if (hugeXp > 0) xpHist.push({ range: '100+', count: hugeXp });


        // 4. Rankings
        const rankingByMatches = [...playersArray].sort((a, b) => b.total - a.total).slice(0, 20);
        const rankingByWinRate = playersArray
            .filter(p => p.total >= 5)
            .map(p => ({ ...p, winRate: parseFloat(((p.wins / p.total) * 100).toFixed(1)) }))
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 20);

        const duosArr = Array.from(duoMap.entries())
            .map(([k, v]) => ({ duo: k, wins: v.wins, total: v.total, winRate: parseFloat(((v.wins / v.total) * 100).toFixed(1)) }))
            .filter(d => d.total >= 3)
            .sort((a, b) => b.winRate - a.winRate)
            .slice(0, 10);

        // 5. Network
        const nodes = Array.from(pmap.keys()).map(n => ({ id: n, group: 1 }));
        const links: any[] = [];
        coMatrix.forEach((targets, source) => {
            targets.forEach((count, target) => {
                if (source < target) links.push({ source, target, value: count });
            });
        });

        const streaks = playersArray
            .map(p => ({ name: p.name, maxStreak: Math.max(p.maxStreak, p.currentStreak), currentStreak: p.currentStreak }))
            .sort((a, b) => b.maxStreak - a.maxStreak)
            .slice(0, 10);

        const postInteractionsMap = (interactions || []).reduce((acc: any, cur: any) => {
            acc[cur.post_id] = (acc[cur.post_id] || 0) + (cur.aurapost ? 1 : 0) + (cur.mogged ? 1 : 0);
            return acc;
        }, {});

        const topPosts = Object.entries(postInteractionsMap)
            .map(([postId, score]: any) => ({ postId, score }))
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 5);

        // Set States
        setSeriesMatchesByDay(byDay);
        setSeriesMatchesByHour(hourBuckets);
        setSeriesMatchesByWeekday(weekdayBuckets);
        setNewPlayersByMonth(newPlayersMap); // Usado agora
        setPlayerExperienceHist(xpHist);     // Usado agora
        setPlayerRankings(rankingByMatches);
        setPlayerWinRates(rankingByWinRate);
        setDuoTop(duosArr);
        setCoPlayMatrix({ nodes, links });
        setStreaksHistorical(streaks);
        setHeatmapHourlyWeek(heat);
        setSocialKPIs({ totalPosts: posts.length, totalComments: comments.length, topPosts });
    }

    // --- D3 FORCE GRAPH EFFECT ---
    useEffect(() => {
        if (!networkRef.current || !coPlayMatrix.nodes.length) return;

        const container = networkRef.current;
        container.innerHTML = '';
        const width = container.clientWidth;
        const height = 400;

        const svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height]);

        const nodes = coPlayMatrix.nodes.map(d => ({ ...d }));
        const links = coPlayMatrix.links.map(d => ({ ...d }));

        const simulation = d3.forceSimulation(nodes as any)
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(20));

        const link = svg.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", (d: any) => Math.sqrt(d.value));

        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g");

        node.append("circle")
            .attr("r", 8)
            .attr("fill", "#4f46e5")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5);

        node.append("text")
            .text((d: any) => d.id)
            .attr('x', 12)
            .attr('y', 4)
            .style('font-size', '10px')
            .style('font-family', 'sans-serif')
            .style('fill', '#333');

        simulation.on("tick", () => {
            link
                .attr("x1", (d: any) => d.source.x)
                .attr("y1", (d: any) => d.source.y)
                .attr("x2", (d: any) => d.target.x)
                .attr("y2", (d: any) => d.target.y);
            node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
        });

        return () => { simulation.stop(); };
    }, [coPlayMatrix]);

    if (loading) return <div className="loading">Carregando Intelligence...</div>;

    return (
        <div className="analytics-container">
            <div className="header-section">
                <h1>Domino Intelligence</h1>
                <p>Análise profunda de métricas, comportamento e rede.</p>
            </div>

            {/* KPIs */}
            <div className="stats-grid" style={{ marginBottom: '30px' }}>
                <div className="stat-card">
                    <h3>Total de Partidas</h3>
                    <div className="big-number" style={{ color: '#4f46e5' }}>{kpis.totalMatches}</div>
                </div>
                <div className="stat-card">
                    <h3>Total de Jogadores</h3>
                    <div className="big-number" style={{ color: '#10b981' }}>{kpis.totalPlayers}</div>
                </div>

                {socialKPIs.totalPosts > 0 && (
                    <div className="stat-card">
                        <h3>Interações Sociais</h3>
                        <div className="big-number" style={{ color: '#ec4899' }}>{socialKPIs.totalPosts}</div>
                    </div>
                )}
            </div>

            <div className="stats-grid">

                {/* Gráfico 1: Evolução Temporal */}
                <div className="chart-box wide">
                    <div className="chart-header"><h3>Evolução de Partidas (Timeline)</h3></div>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={seriesMatchesByDay}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 12 }} />
                            <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                            <Area type="monotone" dataKey="matches" stroke="#4f46e5" fill="rgba(79, 70, 229, 0.1)" strokeWidth={3} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Gráfico 2: Histograma de XP (Recuperado) */}


                {/* Gráfico 3: Novos Jogadores (Recuperado) */}


                {/* Dia da Semana */}
                <div className="chart-box">
                    <h3>Dias Mais Ativos</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={seriesMatchesByWeekday}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                            <XAxis dataKey="weekday" stroke="#6b7280" />
                            <Tooltip cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Top Players */}
                <div className="chart-box wide">
                    <h3>🏆 Top Jogadores (Atividade)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={playerRankings} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            {/* O eixo X mostra a quantidade numérica */}
                            <XAxis type="number" hide />
                            {/* O eixo Y mostra os nomes */}
                            <YAxis
                                dataKey="name"
                                type="category"
                                width={100}
                                stroke="#374151"
                                tick={{ fill: '#374151', fontWeight: 500 }}
                            />
                            <Tooltip />
                            {/* CORREÇÃO AQUI: dataKey="total" em vez de "matches" */}
                            <Bar
                                dataKey="total"
                                name="Partidas"
                                fill="#4f46e5"
                                barSize={18}
                                radius={[0, 4, 4, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Win Rate */}
                <div className="chart-box">
                    <h3>🎯 Eficiência (Win Rate %)</h3>
                    <small>Mínimo 5 partidas</small>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={playerWinRates} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis dataKey="name" type="category" width={100} stroke="#374151" />
                            <Tooltip formatter={(val) => `${val}%`} />
                            <Bar dataKey="winRate" fill="#ec4899" barSize={18} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Network Graph */}


                {/* Heatmap Table */}
                <div className="chart-box wide">
                    <h3>Mapa de Calor Semanal</h3>
                    <div style={{ overflowX: 'auto', marginTop: '15px' }}>
                        <table style={{ width: '100%', borderSpacing: '2px' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', fontSize: '0.8rem', color: '#6b7280' }}>Dia</th>
                                    {Array.from({ length: 24 }).map((_, i) => <th key={i} style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{i}h</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {heatmapHourlyWeek.map((row, d) => (
                                    <tr key={d}>
                                        <td style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#374151' }}>{['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'][d]}</td>
                                        {row.map((val, h) => (
                                            <td key={h}>
                                                <div style={{
                                                    height: '20px',
                                                    backgroundColor: val > 0 ? `rgba(79, 70, 229, ${Math.min(1, val / 5)})` : '#f3f4f6',
                                                    borderRadius: '4px',
                                                    minWidth: '10px'
                                                }} title={`${val} jogos às ${h}h`}></div>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Streaks */}
                <div className="stat-card streak-card">
                    <h3>🔥 Maiores Sequências Históricas</h3>
                    <div className="streak-list">
                        {streaksHistorical.map((s, i) => (
                            <div key={i} className="streak-item">
                                <span className="streak-pos">#{i + 1}</span>
                                <span className="streak-name">{s.name}</span>
                                <span className="streak-count">{s.maxStreak} vitórias seguidas</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Duplas */}
                <div className="chart-box">
                    <h3>🤝 Melhores Duplas</h3>
                    <small>Win Rate % (Min 3 jogos)</small>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: 15 }}>
                        {duoTop.map((d, i) => (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 5, borderBottom: '1px solid #f3f4f6' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#374151' }}>{d.duo}</span>
                                <span style={{ fontWeight: 700, color: '#10b981' }}>{d.winRate}%</span>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
}