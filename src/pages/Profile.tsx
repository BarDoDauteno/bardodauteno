import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../utils/supabase';
import '../styles/Profile.css';

type ProfileData = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    created_at: string;
};

type PlayerStats = {
    totalMatches: number;
    totalWins: number;
    winRate: number;
    favoritePartner: string;
    recentMatches: any[];
};

export default function Profile() {
    const { userId } = useParams();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = React.useState<ProfileData | null>(null);
    const [stats, setStats] = React.useState<PlayerStats | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [isOwnProfile, setIsOwnProfile] = React.useState(false);

    const fetchPlayerStats = async (playerId: string) => {
        try {
            // Primeiro, busca o DominoPlayer ID associado ao user_id
            const { data: dominoPlayer, error: dominoError } = await supabase
                .from('DominoPlayers')
                .select('id')
                .eq('user_id', playerId)
                .single();

            if (dominoError) {
                console.error('Erro ao buscar DominoPlayer:', dominoError);
                return null;
            }

            if (!dominoPlayer) {
                console.log('Nenhum DominoPlayer encontrado para o usuário');
                return {
                    totalMatches: 0,
                    totalWins: 0,
                    winRate: 0,
                    favoritePartner: '-',
                    recentMatches: []
                };
            }

            const dominoPlayerId = dominoPlayer.id;
            console.log('🎯 DominoPlayer ID:', dominoPlayerId);

            // Busca TODAS as partidas (igual faz no ranking)
            const { data: allMatches, error: matchesError } = await supabase
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
                .order('match_date', { ascending: false });

            if (matchesError) {
                console.error('Erro ao buscar partidas:', matchesError);
                return null;
            }

            if (!allMatches || allMatches.length === 0) {
                return {
                    totalMatches: 0,
                    totalWins: 0,
                    winRate: 0,
                    favoritePartner: '-',
                    recentMatches: []
                };
            }

            console.log('📊 Total de partidas encontradas:', allMatches.length);

            // Filtra apenas as partidas onde o jogador participou
            const playerMatches = allMatches.filter(match =>
                match.DominoMatchPlayers.some((p: any) => p.player_id === dominoPlayerId)
            );

            console.log('🎯 Partidas do jogador:', playerMatches.length);

            let totalWins = 0;
            const partnerStats = new Map<string, number>();

            playerMatches.forEach(match => {
                // Encontra o time do jogador
                const playerTeam = match.DominoMatchPlayers.find((p: any) => p.player_id === dominoPlayerId)?.team;

                // Verifica se o time do jogador venceu
                if (playerTeam && match.winning_team === playerTeam) {
                    totalWins++;
                }

                // Conta parceiros (igual faz no ranking)
                match.DominoMatchPlayers.forEach((player: any) => {
                    if (player.player_id !== dominoPlayerId && player.team === playerTeam) {
                        const partnerName = player.DominoPlayers?.display_name || player.guest_name || 'Convidado';
                        partnerStats.set(partnerName, (partnerStats.get(partnerName) || 0) + 1);
                    }
                });
            });

            // Encontra o parceiro mais frequente
            let favoritePartner = '-';
            let maxGames = 0;
            partnerStats.forEach((games, partner) => {
                if (games > maxGames) {
                    maxGames = games;
                    favoritePartner = partner;
                }
            });

            const totalMatches = playerMatches.length;
            const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

            console.log('🏆 Estatísticas calculadas:', {
                totalMatches,
                totalWins,
                winRate,
                favoritePartner
            });

            // Últimas 5 partidas para histórico
            const recentMatches = playerMatches
                .slice(0, 5)
                .map(match => {
                    const playerTeam = match.DominoMatchPlayers.find((p: any) => p.player_id === dominoPlayerId)?.team;
                    const won = playerTeam && match.winning_team === playerTeam;

                    return {
                        id: match.id,
                        won
                    };
                });

            return {
                totalMatches,
                totalWins,
                winRate,
                favoritePartner,
                recentMatches
            };

        } catch (error) {
            console.error('💥 Erro ao calcular estatísticas:', error);
            return null;
        }
    };

    const fetchProfile = async () => {
        if (!userId) {
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Erro ao buscar perfil:', error);
                setLoading(false);
                return;
            }

            setProfile(data);

            // Busca estatísticas do jogador
            const playerStats = await fetchPlayerStats(userId);
            setStats(playerStats);

            // Verifica se é o próprio perfil
            if (currentUser && currentUser.id === userId) {
                setIsOwnProfile(true);
            }
        } catch (error) {
            console.error('Erro ao buscar perfil:', error);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchProfile();
    }, [userId, currentUser]);

    if (loading) {
        return (
            <div className="profile-container">
                <div className="loading-container">
                    <p className="loading">Carregando perfil...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="profile-container">
                <div className="error-container">
                    <p>Perfil não encontrado.</p>
                    <button onClick={() => navigate(-1)} className="back-btn">
                        Voltar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-container">
            <div className="profile-header">
                <button onClick={() => navigate(-1)} className="back-btn">
                    ← Voltar
                </button>
                <h1>Perfil</h1>
                {isOwnProfile && <span className="own-profile-badge">Seu Perfil</span>}
            </div>

            <div className="profile-content">
                <div className="avatar-section">
                    <div className="avatar-container">
                        <img
                            src={profile.avatar_url || 'https://img.freepik.com/fotos-gratis/closeup-tiro-de-uma-linda-borboleta-com-texturas-interessantes-em-uma-flor-de-petalas-de-laranja_181624-7640.jpg?semt=ais_hybrid&w=740&q=80'}
                            alt="Avatar do usuário"
                            className="profile-avatar"
                        />
                    </div>
                </div>

                <div className="profile-info">
                    <h2 className="profile-name">
                        {profile.full_name || 'Usuário sem nome'}
                    </h2>

                    {currentUser && (
                        <p className="profile-email">{currentUser.email}</p>
                    )}

                    {/* Estatísticas do Dominó */}
                    <div className="stats-section">
                        <h3 className="stats-title">📊 Estatísticas de Dominó</h3>

                        {stats ? (
                            <div className="domino-stats">
                                <div className="stats-grid">
                                    <div className="stat-card">
                                        <div className="stat-value">{stats.totalMatches}</div>
                                        <div className="stat-label">Partidas</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats.totalWins}</div>
                                        <div className="stat-label">Vitórias</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-value">{stats.winRate.toFixed(1)}%</div>
                                        <div className="stat-label">Win Rate</div>
                                    </div>
                                </div>

                                <div className="additional-stats">
                                    <div className="additional-stat">
                                        <span className="stat-name">Parceiro Favorito:</span>
                                        <span className="stat-value-small">{stats.favoritePartner}</span>
                                    </div>
                                </div>

                                {/* Histórico Recente */}
                                {stats.recentMatches.length > 0 && (
                                    <div className="recent-matches">
                                        <h4>Últimas Partidas</h4>
                                        <div className="matches-list">
                                            {stats.recentMatches.map((match, index) => (
                                                <div key={match.id} className={`match-result ${match.won ? 'won' : 'lost'}`}>
                                                    <span className="match-number">#{index + 1}</span>
                                                    <span className={`result-badge ${match.won ? 'win' : 'loss'}`}>
                                                        {match.won ? '✅ Vitória' : '❌ Derrota'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="no-stats">
                                <p>Nenhuma estatística de dominó disponível.</p>
                                <button
                                    onClick={() => navigate('/domino')}
                                    className="play-domino-btn"
                                >
                                    🎴 Jogar Dominó
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="profile-meta">
                        <p className="member-since">
                            Membro desde {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                        </p>
                    </div>
                </div>
            </div>

            <div className="profile-actions">
                <button
                    onClick={() => navigate('/domino')}
                    className="action-btn primary"
                >
                    🎴 {isOwnProfile ? 'Minhas Partidas' : 'Ver Partidas'}
                </button>

                <button
                    onClick={() => navigate('/domino')}
                    className="action-btn secondary"
                >
                    📊 Ver Ranking
                </button>
            </div>
        </div>
    );
}