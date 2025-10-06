import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { posts } from '../data/posts'
import type { Post } from '../types/Post'


const PostPage: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const postId = Number(id)
    const post = posts.find((p: Post) => p.id === postId)


    if (!post) {
        return (
            <div className="container">
                <div className="post-page">

                    <h2>Post não encontrado</h2>

                    <Link to="/">← Voltar</Link>
                    <h1>oi</h1>
                </div>
            </div>
        )
    }


    return (
        <div className="container">
            <div className="post-page">
                <h1>{post.title}</h1>
                {post.image_url && <img src={post.image_url} alt={post.title} className="post-full-image" />}
                <p>{post.content}</p>
                <Link to="/" className="back-link">← Voltar</Link>

            </div>
        </div>
    )
}


export default PostPage