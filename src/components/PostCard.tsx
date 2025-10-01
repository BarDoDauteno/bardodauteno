import React from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../types/Post'


interface PostCardProps {
    post: Post
}


const PostCard: React.FC<PostCardProps> = ({ post }) => {
    return (
        <article className="post-card">
            {post.image && <img src={post.image} alt={post.title} className="post-image" />}
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>
            <Link to={`/post/${post.id}`} className="read-more">Leia mais →</Link>
        </article>
    )
}


export default PostCard