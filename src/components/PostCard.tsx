import React from "react";

interface PostCardProps {
    title: string;
    excerpt: string;
}

const PostCard: React.FC<PostCardProps> = ({ title, excerpt }) => (
    <div className="post-card">
        <h2>{title}</h2>
        <p>{excerpt}</p>
        <button>Ler mais</button>
    </div>
);

export default PostCard;
