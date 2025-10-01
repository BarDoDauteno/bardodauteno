import React from "react";
import PostCard from "./PostCard";

const posts = [
    { title: "Primeiro Post", excerpt: "Este é o resumo do primeiro post..." },
    { title: "Segundo Post", excerpt: "Resumo do segundo post aqui..." },
];

const PostList: React.FC = () => (
    <main>
        {posts.map((post, index) => (
            <PostCard key={index} title={post.title} excerpt={post.excerpt} />
        ))}
    </main>
);

export default PostList;
