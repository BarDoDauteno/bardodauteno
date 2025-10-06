// src/pages/CreatePost.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import '../styles/CreatePost.css';

export default function CreatePost() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const newFiles = Array.from(e.target.files);
        if (images.length + newFiles.length > 5) {
            setError('Máximo de 5 imagens permitido.');
            return;
        }
        setImages([...images, ...newFiles]);
        setError(null);
    };

    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title && !content && images.length === 0) {
            setError('O post precisa ter título, conteúdo ou imagem.');
            return;
        }

        if (!user) return;

        setUploading(true);
        setError(null);

        try {
            const uploadedImageUrls: string[] = [];

            for (const image of images) {
                const fileName = `${user.id}/${Date.now()}_${image.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('posts-images')
                    .upload(fileName, image);

                if (uploadError) throw uploadError;

                const {
                    data: { publicUrl },
                } = supabase.storage.from('posts-images').getPublicUrl(fileName);

                uploadedImageUrls.push(publicUrl);
            }

            const { error: insertError } = await supabase.from('Posts').insert([
                {
                    title,
                    excerpt,
                    content,
                    image_url: uploadedImageUrls, // ✅ array direto
                    user_email: user.email,
                    user_id: user.id,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);

            if (insertError) throw insertError;

            setTitle('');
            setExcerpt('');
            setContent('');
            setImages([]);
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro ao criar post.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="create-post-container">
            <div className="create-post-box glass-box">
                <h2>Criar Post</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Título"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                    />
                    <input
                        type="text"
                        placeholder="Resumo (excerpt)"
                        value={excerpt}
                        onChange={(e) => setExcerpt(e.target.value)}
                        maxLength={150}
                    />
                    <textarea
                        placeholder="O que está acontecendo?"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={280}
                    />
                    <div className="char-count">{content.length}/280</div>

                    <div className="image-preview">
                        {images.map((image, i) => (
                            <div key={i} className="image-wrapper">
                                <img src={URL.createObjectURL(image)} alt={`preview ${i}`} />
                                <button type="button" onClick={() => handleRemoveImage(i)}>
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>

                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                    />

                    {error && <p className="error">{error}</p>}

                    <button type="submit" disabled={uploading}>
                        {uploading ? 'Publicando...' : 'Publicar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
