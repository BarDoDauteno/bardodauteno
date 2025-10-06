export interface Post {
    id: number;
    title: string;
    excerpt: string;
    content: string;
    image_url: string[] | null; // ✅ agora array
    created_at: string;
    updated_at: string;
    trash_votes: number;
}
