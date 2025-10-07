
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

