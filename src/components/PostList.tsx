import React from "react";
import PostCard from "./PostCard";

const posts = [
    { title: "Resenha Da Semana", excerpt: "Como Marcos Vinicios Foi Mogado no dia 30/09/2025" },
    { title: "Dupla MVP", excerpt: "Neto&Kadafi Humilham beta no x1" },
    { title: "Teste Comit", excerpt: "------" },
];

const PostList: React.FC = () => (
    <main>
        {posts.map((post, index) => (
            <PostCard key={index} title={post.title} excerpt={post.excerpt} />
        ))}
    </main>
);

export default PostList;
