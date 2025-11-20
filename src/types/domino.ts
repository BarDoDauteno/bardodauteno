
export type DominoMatch = {
    id: number;
    match_date: string;
    winning_team: number | null;
    comments: string | null;
    created_at?: string | null;
    owner_id?: string | null;
};

export type DominoMatchPlayer = {
    id: number;
    match_id: number;
    player_id?: string | null;
    team: number;
};

export type DominoPlayerStats = {
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