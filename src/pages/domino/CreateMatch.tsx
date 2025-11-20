import React, { useEffect, useState } from 'react';
import supabase from '../../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/CreateMatch.css';

type Profile = {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
};

// Tipos para o sistema de votação
type PlayerVotes = {
    [userId: string]: {
        aura: boolean;
        mogged: boolean;
    };
};

type WinCondition = 'bucha' | 'contagem' | 'lasque' | null;

export default function CreateMatch() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [winningTeam, setWinningTeam] = useState<number | null>(null); // Sem default 0 (empate removido)
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);

    // Novas States
    const [winCondition, setWinCondition] = useState<WinCondition>(null);
    const [votes, setVotes] = useState<PlayerVotes>({});

    const cleanName = (name: string | null) => {
        if (!name) return 'Jogador';
        return name.replace(/@gmail\.com$/i, '');
    };

    useEffect(() => {
        if (!user) navigate('/login');

        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .order('full_name', { ascending: true });
            if (!error) setProfiles(data || []);
        };
        fetchProfiles();
    }, [user, navigate]);

    // Gerencia Seleção de Jogadores
    const handleProfileClick = (id: string) => {
        setSelectedPlayers(prev => {
            // Se já existe, remove
            if (prev.includes(id)) {
                const newVotes = { ...votes };
                delete newVotes[id]; // Remove votos se deselecionar
                setVotes(newVotes);
                return prev.filter(pid => pid !== id);
            }
            // Máximo 4
            if (prev.length >= 4) return prev;

            // Adiciona
            return [...prev, id];
        });
    };

    // Gerencia Votação (Aura / Moggado)
    const toggleVote = (playerId: string, type: 'aura' | 'mogged') => {
        setVotes(prev => ({
            ...prev,
            [playerId]: {
                ...prev[playerId],
                [type]: !prev[playerId]?.[type]
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (selectedPlayers.length < 2) {
            alert('Escolha pelo menos 2 jogadores.');
            setLoading(false);
            return;
        }

        if (!winningTeam) {
            alert('Selecione quem ganhou (Vermelho ou Azul).');
            setLoading(false);
            return;
        }

        const teamRed = { p1: selectedPlayers[0] ?? null, p2: selectedPlayers[1] ?? null };
        const teamBlue = { p1: selectedPlayers[2] ?? null, p2: selectedPlayers[3] ?? null };

        // 1. Cria a partida (Agora com win_condition)
        const { data: matchData, error: matchError } = await supabase
            .from('DominoMatches')
            .insert([{
                match_date: new Date().toISOString(),
                winning_team: winningTeam,
                comments,
                owner_id: user?.id || null,
                win_condition: winCondition // Feature Nova: Tipo de Vitória
            }])
            .select('id')
            .single();

        if (matchError || !matchData) {
            console.error(matchError);
            setLoading(false);
            return;
        }

        const matchId = matchData.id;

        // 2. Garante DominoPlayers
        for (const playerId of selectedPlayers) {
            if (!playerId) continue;
            const { data: existing } = await supabase
                .from('DominoPlayers')
                .select('id').eq('user_id', playerId).single();

            if (!existing) {
                await supabase.from('DominoPlayers')
                    .insert([{ user_id: playerId, display_name: profiles.find(p => p.id === playerId)?.full_name || 'Jogador' }]);
            }
        }

        // 3. Busca IDs internos
        const { data: dominoPlayers } = await supabase
            .from('DominoPlayers')
            .select('id, user_id')
            .in('user_id', selectedPlayers);

        const playerMap = new Map();
        dominoPlayers?.forEach(dp => playerMap.set(dp.user_id, dp.id));

        // 4. Insere na Tabela de Ligação (Agora com Aura e Moggado)
        const rows = [
            { userId: teamRed.p1, team: 1 },
            { userId: teamRed.p2, team: 1 },
            { userId: teamBlue.p1, team: 2 },
            { userId: teamBlue.p2, team: 2 },
        ]
            .filter(r => r.userId)
            .map(r => ({
                match_id: matchId,
                player_id: playerMap.get(r.userId),
                team: r.team,
                // Feature Nova: Métricas Individuais
                has_aura: votes[r.userId!]?.aura || false,
                is_mogged: votes[r.userId!]?.mogged || false
            }));

        const { error: playersError } = await supabase
            .from('DominoMatchPlayers')
            .insert(rows);

        if (playersError) console.error(playersError);

        setLoading(false);
        navigate('/domino');
    };

    if (!user) return null;

    return (
        <div className="create-match-container">
            <h2>Criar Partida</h2>
            <p className="subtitle">Selecione os jogadores na ordem da mesa</p>

            <form onSubmit={handleSubmit}>
                {/* SELEÇÃO DE JOGADORES */}
                <div className="team-cards">
                    {profiles.map(p => {
                        const index = selectedPlayers.indexOf(p.id);
                        // Calcula cor baseada na ordem: 0,1=Red, 2,3=Blue
                        const teamClass = index === 0 || index === 1 ? 'team-red-border' : index === 2 || index === 3 ? 'team-blue-border' : '';
                        const isSelected = index !== -1;

                        return (
                            <div
                                key={p.id}
                                className={`profile-card ${isSelected ? 'selected' : ''} ${teamClass}`}
                                onClick={() => handleProfileClick(p.id)}
                            >
                                <div className="avatar-wrapper">
                                    <img src={p.avatar_url || '/default-avatar.png'} alt={p.full_name || ''} />
                                    {isSelected && <span className="team-badge">{index < 2 ? '🔴' : '🔵'}</span>}
                                </div>
                                <span className="name">{cleanName(p.full_name)}</span>
                            </div>
                        );
                    })}
                </div>

                <hr className="divider" />

                {/* QUEM GANHOU + TIPO DE VITÓRIA */}
                <div className="victory-section">
                    <h3>Quem Ganhou?</h3>
                    <div className="team-buttons">
                        <button
                            type="button"
                            className={`team-btn red ${winningTeam === 1 ? 'active' : ''}`}
                            onClick={() => setWinningTeam(1)}
                        >
                            Time Vermelho
                        </button>
                        <button
                            type="button"
                            className={`team-btn blue ${winningTeam === 2 ? 'active' : ''}`}
                            onClick={() => setWinningTeam(2)}
                        >
                            Time Azul
                        </button>
                    </div>

                    {/* TIPO DE VITÓRIA (Só aparece se tiver ganhador) */}
                    {winningTeam && (
                        <div className="win-condition-options fade-in">
                            <p>Como foi a batida?</p>
                            <div className="condition-pills">
                                <button
                                    type="button"
                                    className={winCondition === 'bucha' ? 'active' : ''}
                                    onClick={() => setWinCondition(winCondition === 'bucha' ? null : 'bucha')}
                                >
                                    💥 De Bucha
                                </button>
                                <button
                                    type="button"
                                    className={winCondition === 'contagem' ? 'active' : ''}
                                    onClick={() => setWinCondition(winCondition === 'contagem' ? null : 'contagem')}
                                >
                                    🔢 Contagem
                                </button>
                                <button
                                    type="button"
                                    className={winCondition === 'lasque' ? 'active' : ''}
                                    onClick={() => setWinCondition(winCondition === 'lasque' ? null : 'lasque')}
                                >
                                    🔥 De Lasque
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <hr className="divider" />

                {/* VOTAÇÃO (AURA / MOGGADO) - Só aparece para jogadores selecionados */}
                {selectedPlayers.length > 0 && (
                    <div className="voting-section">
                        <h3>Votação da Galera</h3>
                        <div className="voting-list">
                            {selectedPlayers.map(playerId => {
                                const profile = profiles.find(p => p.id === playerId);
                                return (
                                    <div key={playerId} className="voting-row">
                                        <div className="voter-info">
                                            <img src={profile?.avatar_url || ''} alt="avatar" />
                                            <span>{cleanName(profile?.full_name || '')}</span>
                                        </div>
                                        <div className="vote-actions">
                                            <button
                                                type="button"
                                                className={`vote-btn aura ${votes[playerId]?.aura ? 'active' : ''}`}
                                                onClick={() => toggleVote(playerId, 'aura')}
                                            >
                                                ✨ AURA
                                            </button>
                                            <button
                                                type="button"
                                                className={`vote-btn mogged ${votes[playerId]?.mogged ? 'active' : ''}`}
                                                onClick={() => toggleVote(playerId, 'mogged')}
                                            >
                                                🗿 MOGGADO
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="comments-section">
                    <label>Resenha da partida (opcional)</label>
                    <textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Ex: Fulano jogou o sena pra fora..."
                    />
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Salvando Estatísticas...' : 'Finalizar Partida'}
                </button>
            </form>
        </div>
    );
}