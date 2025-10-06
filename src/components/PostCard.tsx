import React from 'react'
import { Link } from 'react-router-dom'
import type { Post } from '../types/Post'
import '../styles/PostCard.css'
interface PostCardProps {
    post: Post
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
    const images = Array.isArray(post.image_url)
        ? post.image_url
        : post.image_url
            ? [post.image_url]
            : []

    return (
        <article className="post-card">
            {images.length > 0 && (
                <img src={images[0]} alt={post.title} className="post-image" />
            )}
            <h2>{post.title}</h2>
            <p>{post.excerpt}</p>

            {images.length > 1 && (
                <div className="post-thumbnails">
                    {images.slice(1).map((url, i) => (
                        <img
                            key={i}
                            src={url}
                            alt={`thumbnail-${i}`}
                            className="thumb"
                        />
                    ))}
                </div>
            )}

            <Link to={`/post/${post.id}`} className="read-more">
                Leia mais →
            </Link>
        </article>
    )
}

export default PostCard
