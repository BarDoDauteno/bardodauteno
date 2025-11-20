import React, { useEffect, useState, useRef } from 'react';
import supabase from '../../utils/supabase';
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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

// Novo tipo para a View do Banco de Dados
type PlayerStatsView = {
    player_id: string;
    display_name: string;
    avatar_url: string | null;
    total_matches: number;
    total_wins: number;
    win_rate: number;
    total_aura: number;
    total_mogged: number;
    total_bucha: number;
    total_lasque: number;
    total_contagem: number;
};

// -------------------- MAIN COMPONENT --------------------
export default function DominoAnalytics() {
    const [loading, setLoading] = useState(true);

    // KPIs
    const [kpis, setKpis] = useState({ totalMatches: 0, totalPlayers: 0, pctGuests: 0 });
    const [socialKPIs, setSocialKPIs] = useState({ totalPosts: 0, totalComments: 0, topPosts: [] as any[] });

    // Dados Cronológicos (Calculados manualmente via processAll)
    const [seriesMatchesByDay, setSeriesMatchesByDay] = useState<any[]>([]);
    const [seriesMatchesByHour, setSeriesMatchesByHour] = useState<any[]>([]);
    const [seriesMatchesByWeekday, setSeriesMatchesByWeekday] = useState<any[]>([]);
    const [heatmapHourlyWeek, setHeatmapHourlyWeek] = useState<number[][]>([]);
    const [streaksHistorical, setStreaksHistorical] = useState<any[]>([]);
    const [coPlayMatrix, setCoPlayMatrix] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
    const [newPlayersByMonth, setNewPlayersByMonth] = useState<any[]>([]);

    // Dados Estatísticos (Vindos da VIEW vw_domino_player_wins)
    const [viewStats, setViewStats] = useState<PlayerStatsView[]>([]);
    const [duoTop, setDuoTop] = useState<any[]>([]);

    const networkRef = useRef<HTMLDivElement | null>(null);

    // Helper: Limpar nomes
    const cleanName = (name?: string | null) => {
        if (!name) return 'Convidado';
        return name.replace(/@.+$/, '').trim();
    };

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
            // 1. Buscar Dados Brutos para Gráficos Temporais e de Rede
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

            const { data: playersData } = await supabase
                .from('DominoPlayers')
                .select(`id, user_id, display_name, created_at`);

            // 2. Buscar Estatísticas Prontas da VIEW (Aura, Mogged, Win Types)
            const { data: statsView, error: viewError } = await supabase
                .from('vw_domino_player_wins')
                .select('*')
                .order('total_wins', { ascending: false });

            if (viewError) console.warn("Erro ao buscar view de stats:", viewError);
            if (statsView) setViewStats(statsView);

            // 3. Buscar Social
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
            } catch (err) { console.warn("Social tables missing", err); }

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
        const totalMatches = matchesRows.length;
        const pmap = new Map<string, any>();

        // Matrizes e Mapas para processamento manual (Timeline, Heatmap, Rede)
        const winMatrix = new Map<string, Map<string, number>>();
        const duoMap = new Map<string, { wins: number; total: number }>();
        const heat = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));

        const addWin = (a: string, b: string) => {
            if (a === b) return;
            // Garante ordem alfabética para A-B ser igual a B-A
            const [p1, p2] = [a, b].sort();

            if (!winMatrix.has(p1)) winMatrix.set(p1, new Map());
            const row = winMatrix.get(p1)!;
            row.set(p2, (row.get(p2) || 0) + 1);
        };

        const ensurePlayer = (name: string) => {
            if (!pmap.has(name)) {
                pmap.set(name, { name, wins: 0, total: 0, currentStreak: 0, maxStreak: 0 });
            }
            return pmap.get(name)!;
        };

        let guestAppearanceCount = 0;
        let totalSlots = 0;

        matchesRows.forEach((m) => {
            const date = new Date(m.match_date);
            heat[date.getDay()][date.getHours()]++;

            const team1Players = (m.DominoMatchPlayers || []).filter(mp => mp.team === 1);
            const team2Players = (m.DominoMatchPlayers || []).filter(mp => mp.team === 2);

            const team1Names = team1Players.map(mp => cleanName(getPlayerName(mp)));
            const team2Names = team2Players.map(mp => cleanName(getPlayerName(mp)));
            const allNames = [...team1Names, ...team2Names];

            totalSlots += (m.DominoMatchPlayers || []).length;
            (m.DominoMatchPlayers || []).forEach(mp => { if (!mp.player_id) guestAppearanceCount++; });

            // Rede
            if (m.winning_team === 1 && team1Names.length === 2) {
                addWin(team1Names[0], team1Names[1]);
            }
            if (m.winning_team === 2 && team2Names.length === 2) {
                addWin(team2Names[0], team2Names[1]);
            }

            // Streaks (Calculado manual pq precisa da ordem cronológica)
            allNames.forEach(name => {
                const stat = ensurePlayer(name);
                stat.total++;
                const isTeam1 = team1Names.includes(name);
                const didWin = (isTeam1 && m.winning_team === 1) || (!isTeam1 && m.winning_team === 2);

                if (didWin) {
                    stat.wins++;
                    stat.currentStreak++;
                } else {
                    stat.maxStreak = Math.max(stat.maxStreak, stat.currentStreak);
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

        // --- SET STATES (Dados Temporais e de Rede) ---
        setKpis({
            totalMatches,
            totalPlayers: playersRows.length,
            pctGuests: totalSlots > 0 ? Math.round((guestAppearanceCount / totalSlots) * 100) : 0
        });

        // Timeline
        const byDay = d3.rollups(matchesRows, v => v.length, m => (new Date(m.match_date)).toISOString().slice(0, 10))
            .map(([date, matches]) => ({ date, matches })).sort((a, b) => a.date.localeCompare(b.date));
        setSeriesMatchesByDay(byDay);

        // Hour & Weekday buckets
        const hourBuckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, matches: 0 }));
        matchesRows.forEach(m => hourBuckets[new Date(m.match_date).getHours()].matches++);
        setSeriesMatchesByHour(hourBuckets);

        const weekdayBuckets = Array.from({ length: 7 }, (_, w) => ({ weekday: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][w], count: 0 }));
        matchesRows.forEach(m => weekdayBuckets[new Date(m.match_date).getDay()].count++);
        setSeriesMatchesByWeekday(weekdayBuckets);

        // Streaks
        const playersArray = Array.from(pmap.values());
        const streaks = playersArray
            .map(p => ({ name: p.name, maxStreak: Math.max(p.maxStreak, p.currentStreak), currentStreak: p.currentStreak }))
            .sort((a, b) => b.maxStreak - a.maxStreak).slice(0, 10);
        setStreaksHistorical(streaks);

        // Duos
        const duosArr = Array.from(duoMap.entries())
            .map(([k, v]) => ({ duo: k, wins: v.wins, total: v.total, winRate: parseFloat(((v.wins / v.total) * 100).toFixed(1)) }))
            .filter(d => d.total >= 3).sort((a, b) => b.winRate - a.winRate).slice(0, 10);
        setDuoTop(duosArr);

        // New Players Timeline
        const newPlayersMap = d3.rollups(playersRows, v => v.length, p => (p.created_at ? new Date(p.created_at).toISOString().slice(0, 7) : 'Antigo'))
            .map(([month, count]) => ({ month, count })).sort((a, b) => a.month.localeCompare(b.month));
        setNewPlayersByMonth(newPlayersMap);

        // Heatmap & Network
        setHeatmapHourlyWeek(heat);

        const nodes = Array.from(pmap.keys()).map(n => ({ id: n, group: 1 }));
        const links: any[] = [];

        winMatrix.forEach((targets, source) => {
            targets.forEach((count, target) => {
                // count agora representa VITÓRIAS JUNTOS
                links.push({ source, target, value: count });
            });
        });

        setCoPlayMatrix({ nodes, links });

        // Social KPIs
        const postInteractionsMap = (interactions || []).reduce((acc: any, cur: any) => {
            acc[cur.post_id] = (acc[cur.post_id] || 0) + (cur.aurapost ? 1 : 0) + (cur.mogged ? 1 : 0);
            return acc;
        }, {});
        const topPosts = Object.entries(postInteractionsMap)
            .map(([postId, score]: any) => ({ postId, score }))
            .sort((a: any, b: any) => b.score - a.score).slice(0, 5);
        setSocialKPIs({ totalPosts: posts.length, totalComments: comments.length, topPosts });
    }

    // --- D3 FORCE GRAPH ---
    useEffect(() => {
        if (!networkRef.current || !coPlayMatrix.nodes.length) return;
        const container = networkRef.current;
        container.innerHTML = '';
        const width = container.clientWidth;
        const height = 450;
        const svg = d3.select(container).append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', [0, 0, width, height])
            .style('background', 'transparent') // Deixa transparente para usar o fundo da div
            .style('border-radius', '12px');

        const nodes = coPlayMatrix.nodes.map(d => ({ ...d }));
        const links = coPlayMatrix.links.map(d => ({ ...d }));


        // 1. ESCALA DE CORES PERSONALIZADA
        // Domínio: [1 vitória, 3 vitórias, 6 vitórias, 10+ vitórias]
        const colorScale = d3.scaleLinear<string>()
            .domain([1, 3, 6, 9])
            .range(['#4b5563', '#22d3ee', '#c084fc', '#ef4444'])
            .clamp(true); // Se passar de 10, mantem a cor vermelha

        // 2. Simulação de Física
        const simulation = d3.forceSimulation(nodes as any)
            .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100)) // Distância maior para ver melhor
            .force("charge", d3.forceManyBody().strength(-300)) // Repulsão maior para não embolar
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide(25));

        // 3. Renderizar Links (Linhas)
        const link = svg.append("g")
            .selectAll("line")
            .data(links)
            .join("line")
            .attr("stroke", (d: any) => colorScale(d.value)) // APLICA A COR AQUI
            .attr("stroke-opacity", 0.8)
            .attr("stroke-width", (d: any) => Math.max(1, Math.sqrt(d.value) * 2)); // Linha mais grossa se tiver mais vitórias

        // 4. Renderizar Nós (Bolinhas)
        const node = svg.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(d3.drag<any, any>() // Adiciona arraste (drag & drop)
                .on("start", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on("drag", (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on("end", (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }));

        node.append("circle")
            .attr("r", 8)
            .attr("fill", "#1f2937") // Miolo escuro
            .attr("stroke", "#fff")
            .attr("stroke-width", 2);

        // Label (Nome do Jogador)
        node.append("text")
            .text((d: any) => d.id)
            .attr('x', 12)
            .attr('y', 4)
            .style('font-size', '11px')
            .style('font-weight', 'bold')
            .style('fill', '#e5e7eb') // Texto claro
            .style('pointer-events', 'none')
            .style('text-shadow', '0px 0px 3px #000');

        // 5. Legenda Visual (Opcional, mas ajuda muito)
        const legend = svg.append("g").attr("transform", "translate(20, 20)");

        const legendData = [
            { label: "1 Win", color: "#4b5563" },
            { label: "3 Wins", color: "#22d3ee" },
            { label: "6 Wins", color: "#c084fc" },
            { label: "9+ Wins", color: "#ef4444" }
        ];

        legendData.forEach((item, i) => {
            const row = legend.append("g").attr("transform", `translate(0, ${i * 20})`);
            row.append("rect").attr("width", 12).attr("height", 12).attr("fill", item.color).attr("rx", 2);
            row.append("text").attr("x", 20).attr("y", 10).text(item.label).style("fill", "#9ca3af").style("font-size", "10px");
        });

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

    // PREPARAÇÃO DE DADOS ESPECÍFICOS PARA OS NOVOS GRÁFICOS
    const auraRanking = [...viewStats].sort((a, b) => b.total_aura - a.total_aura).slice(0, 10);
    const moggedRanking = [...viewStats].sort((a, b) => b.total_mogged - a.total_mogged).slice(0, 10);

    // Dados para o Gráfico de Tipos de Vitória (Stacked Bar)
    const winTypeStats = viewStats
        .filter(p => p.total_wins > 0)
        .slice(0, 10)
        .map(p => ({
            name: p.display_name,
            Bucha: p.total_bucha,
            Lasque: p.total_lasque,
            Contagem: p.total_contagem
        }));

    if (loading) return <div className="loading">Carregando Intelligence...</div>;

    return (
        <div className="analytics-container">
            <div className="header-section">
                <h1>Domino Intelligence</h1>
                <p>Análise de Performance, Aura e Rede de Jogadores.</p>
            </div>

            {/* KPIs */}
            <div className="stats-grid" style={{ marginBottom: '30px' }}>
                <div className="stat-card">
                    <h3>Total de Partidas</h3>
                    <div className="big-number" style={{ color: '#4f46e5' }}>{kpis.totalMatches}</div>
                </div>
                <div className="stat-card">
                    <h3>Jogadores Ativos</h3>
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

                {/* 1. Evolução Temporal */}
                <div className="chart-box wide">
                    <div className="chart-header"><h3>Timeline de Partidas</h3></div>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={seriesMatchesByDay}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#6b7280" />
                            <Tooltip />
                            <Area type="monotone" dataKey="matches" stroke="#4f46e5" fill="rgba(79, 70, 229, 0.1)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* 2. Dias Mais Ativos */}
                <div className="chart-box">
                    <h3>Dias da Semana</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={seriesMatchesByWeekday}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                            <XAxis dataKey="weekday" stroke="#6b7280" />
                            <Tooltip cursor={{ fill: 'transparent' }} />
                            <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 3. Novos Jogadores */}
                <div className="chart-box">
                    <h3>Crescimento (Novos Jogadores)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={newPlayersByMonth}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                            <XAxis dataKey="month" stroke="#6b7280" />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke="#10b981" fill="rgba(16, 185, 129, 0.1)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* 4. TOP PLAYERS (Total de Vitórias) */}
                <div className="chart-box wide">
                    <h3>🏆 Ranking de Vitórias</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={viewStats.slice(0, 15)} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="display_name" type="category" width={100} stroke="#374151" tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Bar dataKey="total_wins" name="Vitórias" fill="#4f46e5" barSize={18} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 5. ESTILO DE VITÓRIA (NOVO) */}
                <div className="chart-box wide">
                    <h3>🎨 Estilo de Vitória (Top 10)</h3>
                    <small>Bucha vs Lasque vs Contagem</small>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={winTypeStats} layout="vertical" margin={{ left: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={100} stroke="#374151" tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="Bucha" stackId="a" fill="#f59e0b" barSize={20} />
                            <Bar dataKey="Contagem" stackId="a" fill="#3b82f6" barSize={20} />
                            <Bar dataKey="Lasque" stackId="a" fill="#ef4444" barSize={20} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 6. RANKING DE AURA (NOVO) */}
                <div className="chart-box">
                    <h3>✨ Ranking de Aura</h3>
                    <small>Jogadores mais "iluminados"</small>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={auraRanking} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="display_name" type="category" width={90} stroke="#374151" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="total_aura" name="Auras" fill="#8b5cf6" barSize={15} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 7. RANKING DE MOGGED (NOVO) */}
                <div className="chart-box">
                    <h3>🗿 Mural do Mogged</h3>
                    <small>Quem foi mais moggado</small>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={moggedRanking} layout="vertical">
                            <XAxis type="number" hide />
                            <YAxis dataKey="display_name" type="category" width={90} stroke="#374151" tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="total_mogged" name="Moggadas" fill="#374151" barSize={15} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 8. Win Rate */}
                <div className="chart-box">
                    <h3>🎯 Eficiência (Win Rate %)</h3>
                    <small>Mín. 5 partidas</small>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={viewStats.filter(p => p.total_matches >= 5).sort((a, b) => b.win_rate - a.win_rate).slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                            <XAxis type="number" hide domain={[0, 100]} />
                            <YAxis dataKey="display_name" type="category" width={100} stroke="#374151" />
                            <Tooltip formatter={(val) => `${val}%`} />
                            <Bar dataKey="win_rate" fill="#ec4899" barSize={18} radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 9. Rede de Conexões */}
                <div className="chart-box wide" style={{ minHeight: '450px' }}>
                    <h3>🕸️ Rede de Jogadores</h3>
                    <div ref={networkRef} style={{ width: '100%', height: '400px', background: '#fafafa', borderRadius: '12px' }} />

                </div>

                {/* 10. Streaks */}
                <div className="stat-card streak-card">
                    <h3>🔥 Maiores Sequências</h3>
                    <div className="streak-list">
                        {streaksHistorical.map((s, i) => (
                            <div key={i} className="streak-item">
                                <span className="streak-pos">#{i + 1}</span>
                                <span className="streak-name">{s.name}</span>
                                <span className="streak-count">{s.maxStreak} vitórias</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 11. Melhores Duplas */}
                <div className="chart-box">
                    <h3>🤝 Top Duplas</h3>
                    <ul style={{ listStyle: 'none', padding: 0, marginTop: 15 }}>
                        {duoTop.map((d, i) => (
                            <li key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 5, borderBottom: '1px solid #eee' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#333' }}>{d.duo}</span>
                                <span style={{ fontWeight: 700, color: '#10b981' }}>{d.winRate}%</span>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>
        </div>
    );
}