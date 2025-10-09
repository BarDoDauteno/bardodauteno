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

export default function CreateMatch() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
    const [winningTeam, setWinningTeam] = useState<number | null>(0);
    const [comments, setComments] = useState('');
    const [loading, setLoading] = useState(false);
    const cleanName = (name: string | null) => {
        if (!name) return 'Jogador';
        return name.replace(/@gmail\.com$/i, '');
    };
    useEffect(() => {
        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .order('full_name', { ascending: true });
            if (error) console.error(error);
            else setProfiles(data || []);
        };
        fetchProfiles();
    }, []);

    const handleProfileClick = (id: string) => {
        setSelectedPlayers(prev => {
            if (prev.includes(id)) return prev.filter(pid => pid !== id);
            if (prev.length >= 4) return prev;
            return [...prev, id];
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (selectedPlayers.length < 2) {
            alert('Escolha pelo menos 2 jogadores.');
            setLoading(false);
            return;
        }

        const teamRed = { p1: selectedPlayers[0] ?? null, p2: selectedPlayers[1] ?? null };
        const teamBlue = { p1: selectedPlayers[2] ?? null, p2: selectedPlayers[3] ?? null };

        // Cria a partida
        const { data: matchData, error: matchError } = await supabase
            .from('DominoMatches')
            .insert([{
                match_date: new Date().toISOString(),
                winning_team: winningTeam ?? 0,
                comments,
                owner_id: user?.id || null
            }])
            .select('id')
            .single();

        if (matchError || !matchData) {
            console.error(matchError);
            setLoading(false);
            return;
        }

        const matchId = matchData.id;

        // Cria ou garante DominoPlayers
        for (const playerId of selectedPlayers) {
            if (!playerId) continue;
            const { data: existing } = await supabase
                .from('DominoPlayers')
                .select('id')
                .eq('user_id', playerId)
                .single();

            if (!existing) {
                await supabase
                    .from('DominoPlayers')
                    .insert([{ user_id: playerId, display_name: profiles.find(p => p.id === playerId)?.full_name || 'Jogador' }]);
            }
        }

        // Busca os IDs dos DominoPlayers criados
        const { data: dominoPlayers } = await supabase
            .from('DominoPlayers')
            .select('id, user_id')
            .in('user_id', selectedPlayers);

        // Cria mapa para relacionar user_id com domino_player_id
        const playerMap = new Map();
        dominoPlayers?.forEach(dp => {
            playerMap.set(dp.user_id, dp.id);
        });

        // Insere jogadores na DominoMatchPlayers
        const rows = [
            { match_id: matchId, player_id: playerMap.get(teamRed.p1), team: 1 },
            { match_id: matchId, player_id: playerMap.get(teamRed.p2), team: 1 },
            { match_id: matchId, player_id: playerMap.get(teamBlue.p1), team: 2 },
            { match_id: matchId, player_id: playerMap.get(teamBlue.p2), team: 2 },
        ].filter(r => r.player_id !== undefined && r.player_id !== null);

        const { error: playersError } = await supabase
            .from('DominoMatchPlayers')
            .insert(rows);

        if (playersError) console.error(playersError);

        setLoading(false);
        navigate('/domino');
    };

    return (
        <div className="create-match-container">
            <h2>Criar Partida de</h2>
            <p>Os 2 primeiros serão o Time Vermelho</p>

            <form onSubmit={handleSubmit}>
                <div className="team-cards">
                    {profiles.map(p => {
                        const index = selectedPlayers.indexOf(p.id);
                        const teamClass = index === 0 || index === 1 ? 'team-red' : index === 2 || index === 3 ? 'team-blue' : '';
                        return (
                            <div key={p.id} className={`profile-card ${teamClass}`} onClick={() => handleProfileClick(p.id)}>
                                <img src={p.avatar_url || '/default-avatar.png'} alt={p.full_name || ''} />
                                <span>{cleanName(p.full_name)}</span>
                            </div>
                        );
                    })}
                </div>

                <div className="winning-team">
                    <label>Vencedor:</label>
                    <div className="team-buttons">
                        <button
                            className={winningTeam === 0 ? 'selected' : ''}
                            onClick={() => setWinningTeam(0)}
                            style={{ backgroundColor: '#808080', color: 'white' }}
                        >
                            Sem resultado / empate
                        </button>
                        <button
                            className={winningTeam === 1 ? 'selected' : ''}
                            onClick={() => setWinningTeam(1)}
                            style={{ backgroundColor: '#ff4d4d', color: 'white' }}
                        >
                            Vermelho
                        </button>
                        <button
                            className={winningTeam === 2 ? 'selected' : ''}
                            onClick={() => setWinningTeam(2)}
                            style={{ backgroundColor: '#4d4dff', color: 'white' }}
                        >
                            Azul
                        </button>
                    </div>
                </div>

                <div className="comments-section">
                    <label>Comentário</label>
                    <textarea value={comments} onChange={(e) => setComments(e.target.value)} />
                </div>

                <button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Criar partida'}</button>
            </form>
        </div>
    );
}