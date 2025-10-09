import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import type { Post } from "../types/Post";
import PostCard from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import "../styles/AllPosts.css";

type AggregatedPost = Post & {
    moggedCount: number;
    aurasCount: number;
    commentsCount: number;
};

type FilterType = "recent" | "mogged" | "auras" | "comments";

export default function AllPosts() {
    const [posts, setPosts] = useState<AggregatedPost[]>([]);
    const [filteredPosts, setFilteredPosts] = useState<AggregatedPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<FilterType>("recent");
    const [showSearch, setShowSearch] = useState(false);
    const { isAdmin } = useAuth();

    const getPostWithCounts = async (p: any): Promise<AggregatedPost> => {
        const images: string[] = Array.isArray(p.image_url)
            ? p.image_url
            : p.image_url
                ? [p.image_url]
                : [];

        // Busca interações baseado na sua tabela real
        const { data: interactions } = await supabase
            .from("PostInteractions")
            .select("mogged, aurapost")
            .eq("post_id", p.id);

        const moggedCount = interactions?.filter((i) => i.mogged).length ?? 0;
        const aurasCount = interactions?.filter((i) => i.aurapost).length ?? 0;

        const { data: comments } = await supabase
            .from("PostComments")
            .select("id")
            .eq("post_id", p.id);

        const commentsCount = comments?.length ?? 0;

        return {
            ...p,
            image_url: images,
            moggedCount,
            aurasCount,
            commentsCount
        };
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

        // Ordenação baseada nas colunas reais
        switch (sortBy) {
            case "mogged":
                results.sort((a, b) => b.moggedCount - a.moggedCount);
                break;
            case "auras":
                results.sort((a, b) => b.aurasCount - a.aurasCount);
                break;
            case "comments":
                results.sort((a, b) => b.commentsCount - a.commentsCount);
                break;
            default: // "recent"
                results.sort(
                    (a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
        }

        setFilteredPosts(results);
    }, [search, sortBy, posts]);

    const filterButtons = [
        { value: "recent" as FilterType, label: "Recentes", icon: "🕒" },
        { value: "mogged" as FilterType, label: "Mogged", icon: "😠" },
        { value: "auras" as FilterType, label: "Aura", icon: "✨" },
        { value: "comments" as FilterType, label: "Comentários", icon: "💬" },
    ];

    if (loading) return <p className="loading">Carregando posts...</p>;

    return (
        <div className="all-posts-container">
            <header className="all-posts-header">


                <div className="filters-container">
                    {/* Botão de busca móvel */}
                    <div className="mobile-search-toggle">
                        <button
                            className={`search-toggle-btn ${showSearch ? 'active' : ''}`}
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            🔍
                        </button>
                    </div>

                    {/* Campo de busca */}
                    <div className={`search-section ${showSearch ? 'show' : ''}`}>
                        <div className="search-input-wrapper">
                            <input
                                type="text"
                                placeholder="Buscar posts..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="search-input"
                            />
                            {search && (
                                <button
                                    className="clear-search"
                                    onClick={() => setSearch('')}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filtros de ordenação */}
                    <div className="sort-filters">
                        {filterButtons.map((filter) => (
                            <button
                                key={filter.value}
                                className={`filter-btn ${sortBy === filter.value ? 'active' : ''}`}
                                onClick={() => setSortBy(filter.value)}
                            >
                                <span className="filter-icon">{filter.icon}</span>
                                <span className="filter-label">{filter.label}</span>
                            </button>
                        ))}
                    </div>
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
                                    ? (id) => {
                                        setFilteredPosts((prev) => prev.filter((p) => p.id !== id));
                                        setPosts((prev) => prev.filter((p) => p.id !== id));
                                    }
                                    : undefined
                            }
                        />
                    ))
                ) : (
                    <div className="no-results">
                        <p>📭 Nenhum post encontrado</p>
                        {search && (
                            <button
                                className="clear-filters"
                                onClick={() => {
                                    setSearch('');
                                    setSortBy('recent');
                                }}
                            >
                                Limpar filtros
                            </button>
                        )}
                    </div>
                )}
            </section>
        </div>
    );
}