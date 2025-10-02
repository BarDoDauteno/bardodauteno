// src/pages/CreatePost.tsx
import { useState } from 'react';
import supabase from '../utils/supabase';

export default function CreatePost() {
    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase
            .from('Posts')
            .insert([{
                title,
                excerpt,
                content,
                image_url: imageUrl,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);

        if (error) setMessage(`Erro: ${error.message}`);
        else {
            setMessage('Post criado com sucesso!');
            setTitle(''); setExcerpt(''); setContent(''); setImageUrl('');
        }

        setLoading(false);
    };

    return (
        <div className="create-post-page">
            <h1>Criar Post</h1>
            <form onSubmit={handleSubmit}>
                <input type="text" placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} required />
                <input type="text" placeholder="Resumo" value={excerpt} onChange={e => setExcerpt(e.target.value)} required />
                <textarea placeholder="Conteúdo" value={content} onChange={e => setContent(e.target.value)} required />
                <input type="text" placeholder="URL da Imagem" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                <button type="submit" disabled={loading}>{loading ? 'Enviando...' : 'Criar Post'}</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
}
