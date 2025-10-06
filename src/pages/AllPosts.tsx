import { useEffect, useState, useMemo } from "react";
import supabase from "../utils/supabase";
import type { Post } from "../types/Post";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import "../styles/AllPosts.css";

type AggregatedPost = Post & {
    likesCount: number;
    aurasCount: number;
    commentsCount: number;
};

export default function AllPosts() {
    const [posts, setPosts] = useState<AggregatedPost[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<AggregatedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("recent");
    const { isAdmin } = useAuth();

    const getPostWithCounts = async (p: any): Promise<AggregatedPost> => {
        const images: string[] = Array.isArray(p.image_url)
            ? p.image_url
            : p.image_url
                ? [p.image_url]
                : [];

        const { data: interactions } = await supabase
            .from("PostInteractions")
            .select("liked, aurapost")
            .eq("post_id", p.id);

        const likesCount = interactions?.filter((i) => i.liked).length ?? 0;
        const aurasCount = interactions?.filter((i) => i.aurapost).length ?? 0;

        const { data: comments } = await supabase
            .from("PostComments")
            .select("id")
            .eq("post_id", p.id);

        const commentsCount = comments?.length ?? 0;

        return { ...p, image_url: images, likesCount, aurasCount, commentsCount };
    };

    const fetchAllPosts = async () => {
        setLoading(true);
        try {
            const { data: postsData, error } = await supabase
                .from("Posts")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            const normalized = await Promise.all(
                (postsData ?? []).map(getPostWithCounts)
            );
            setPosts(normalized);
            setFilteredPosts(normalized);
        } catch (err) {
            console.error("Erro ao buscar posts:", err);
            setPosts([]);
            setFilteredPosts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllPosts();
    }, []);

    // 🔍 Atualiza os resultados quando busca ou filtro mudam
    useEffect(() => {
        let results = [...posts];

        // Filtro por texto
        if (search.trim()) {
            const term = search.toLowerCase();
            results = results.filter(
                (p) =>
                    p.title?.toLowerCase().includes(term) ||
                    p.content?.toLowerCase().includes(term)
            );
        }

        // Ordenação
        switch (sortBy) {
            case "likes":
                results.sort((a, b) => b.likesCount - a.likesCount);
                break;
            case "auras":
                results.sort((a, b) => b.aurasCount - a.aurasCount);
                break;
            case "comments":
                results.sort((a, b) => b.commentsCount - a.commentsCount);
                break;
            default:
                results.sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
        }

        setFilteredPosts(results);
    }, [search, sortBy, posts]);

    if (loading) return <p className="loading">Carregando posts...</p>;

    return (
        <div className="all-posts-container">
            <header className="all-posts-header">
                <h2>📰 Todos os Posts</h2>

                <div className="filters">
                    <input
                        type="text"
                        placeholder="Buscar por título ou conteúdo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="search-input"
                    />

                    <select
                        className="sort-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="recent">Mais recentes</option>
                        <option value="likes">Mais curtidos</option>
                        <option value="auras">Mais aura</option>
                        <option value="comments">Mais comentados</option>
                    </select>
                </div>
            </header>

            <section className="post-grid">
                {filteredPosts.length > 0 ? (
                    filteredPosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            onDelete={
                                isAdmin
                                    ? (id) => setFilteredPosts((prev) => prev.filter((p) => p.id !== id))
                                    : undefined
                            }
                        />
                    ))
                ) : (
                    <p className="no-results">Nenhum post encontrado.</p>
                )}
            </section>
        </div>
    );
}
