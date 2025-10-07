import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../../utils/supabase';
import '../../styles/MatchPage.css';

type Player = {
    id: string;
    display_name: string;
    avatar_url: string | null;
    team: number;
};

type Match = {
    id: number;
    match_date: string;
    winning_team: number;
    comments: string;
    players: Player[];
};

export default function MatchPage() {
    const { matchId } = useParams<{ matchId: string }>();
    const navigate = useNavigate();
    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);

    // Função para remover @gmail.com dos nomes
    const cleanName = (name: string) => {
        if (!name) return 'Convidado';
        return name.replace(/@gmail\.com$/i, '');
    };

    useEffect(() => {
        const fetchMatch = async () => {
            if (!matchId) return;

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
                            id,
                            display_name,
                            profiles (
                                avatar_url
                            )
                        )
                    )
                `)
                .eq('id', Number(matchId))
                .single();

            if (error) {
                console.error('Erro ao buscar partida:', error);
                setLoading(false);
                return;
            }

            const players: Player[] = (data.DominoMatchPlayers || []).map((p: any) => ({
                id: p.player_id || p.guest_name || `guest-${Math.random()}`,
                team: p.team,
                display_name: cleanName(p.DominoPlayers?.display_name || p.guest_name || 'Convidado'),
                avatar_url: p.DominoPlayers?.profiles?.avatar_url || null,
            }));

            setMatch({ ...data, players });
            setLoading(false);
        };

        fetchMatch();
    }, [matchId]);

    if (loading) return <p>Carregando partida...</p>;
    if (!match) return <p>Partida não encontrada.</p>;

    const teamRed = match.players.filter(p => p.team === 1);
    const teamBlue = match.players.filter(p => p.team === 2);

    return (
        <div className="match-page-container">
            <h2>Partida de Dominó</h2>
            <p>Data: {new Date(match.match_date).toLocaleString()}</p>
            <p>Vencedor: {match.winning_team === 0 ? 'Empate / Sem resultado' : match.winning_team === 1 ? 'Time Vermelho' : 'Time Azul'}</p>
            <p>Comentário: {match.comments || '-'}</p>

            <div className="teams-container">
                <div>
                    <h3>Time Vermelho</h3>
                    <div className="team-players">
                        {teamRed.map(p => (
                            <div key={p.id} className="profile-card">
                                <img src={p.avatar_url || '/default-avatar.png'} alt={p.display_name} />
                                <span>{p.display_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3>Time Azul</h3>
                    <div className="team-players">
                        {teamBlue.map(p => (
                            <div key={p.id} className="profile-card">
                                <img src={p.avatar_url || '/default-avatar.png'} alt={p.display_name} />
                                <span>{p.display_name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <button onClick={() => navigate('/domino')}>Voltar</button>
        </div>
    );
}