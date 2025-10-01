import React from 'react'
import PostCard from './PostCard'
import { posts } from '../data/posts'
import type { Post } from '../types/Post'


const PostList: React.FC = () => {
    return (
        <section className="post-grid">
            {posts.map((post: Post) => (
                <PostCard key={post.id} post={post} />
            ))}
        </section>
    )
}


export default PostList