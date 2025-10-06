
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/supabase';
import { useAuth } from '../context/AuthContext';
import '../styles/CreatePost.css';

type Preview = {
    id: string;
    url: string;
    type: string;
    name: string;
    size: number;
};

export default function CreatePost() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const inputRef = useRef<HTMLInputElement | null>(null);

    const [title, setTitle] = useState('');
    const [excerpt, setExcerpt] = useState('');
    const [content, setContent] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<Preview[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const MAX_FILES = 10;
    const BUCKET = 'posts-images'; // usar bucket existente; troque se preferir outro bucket

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // função utilitária para criar id unico
    const makeId = () =>
        `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // formata bytes legíveis
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // quando usuário seleciona arquivos — append (não substitui)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newFiles = Array.from(e.target.files || []);
        if (files.length + newFiles.length > MAX_FILES) {
            setError(`Máximo de ${MAX_FILES} arquivos permitido.`);
            return;
        }

        // criar previews para os novos arquivos
        const newPreviews = newFiles.map((f) => ({
            id: makeId(),
            url: URL.createObjectURL(f),
            type: f.type,
            name: f.name,
            size: f.size,
        }));

        setFiles((prev) => [...prev, ...newFiles]);
        setPreviews((prev) => [...prev, ...newPreviews]);
        setError(null);

        // opcional: limpa o value do input para permitir re-selecionar o mesmo arquivo depois
        if (inputRef.current) inputRef.current.value = '';
    };

    // remove arquivo (por índice)
    const handleRemoveFile = (index: number) => {
        setFiles((prev) => {
            const removed = prev[index];
            // nada especial a fazer com removed além de atualizar o estado
            return prev.filter((_, i) => i !== index);
        });

        setPreviews((prev) => {
            const removed = prev[index];
            if (removed) {
                try {
                    URL.revokeObjectURL(removed.url);
                } catch (err) {
                    // ignore
                }
            }
            return prev.filter((_, i) => i !== index);
        });
    };

    // cleanup — revogar objectURLs quando componente desmonta
    useEffect(() => {
        return () => {
            previews.forEach((p) => {
                try {
                    URL.revokeObjectURL(p.url);
                } catch (_) { }
            });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title && !content && files.length === 0) {
            setError('O post precisa ter título, conteúdo ou pelo menos um arquivo.');
            return;
        }
        if (!user) {
            setError('Usuário não encontrado. Faça login novamente.');
            return;
        }

        setUploading(true);
        setError(null);

        try {
            const uploadedUrls: string[] = [];

            // subir arquivos um a um (sequencial). Se preferir paralelizar, usar Promise.all
            for (const file of files) {
                const safeName = file.name.replace(/\s+/g, '_');
                const filePath = `${user.id}/${Date.now()}_${safeName}`;

                const { error: uploadError } = await supabase.storage
                    .from(BUCKET)
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // getPublicUrl é síncrono na SDK v2 (retorna objeto com data.publicUrl)
                const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
                const publicUrl = (data as any)?.publicUrl ?? (data as any)?.public_url;

                if (!publicUrl) {
                    // fallback gerado (caso raro) — tente construir URL pública padrão (opcional)
                    throw new Error('Não foi possível obter a URL pública do arquivo.');
                }

                uploadedUrls.push(publicUrl);
            }

            // inserir post com array de URLs
            const { error: insertError } = await supabase.from('Posts').insert([
                {
                    title,
                    excerpt,
                    content,
                    image_url: uploadedUrls, // armazena array diretamente (text[])
                    user_email: user.email,
                    user_id: user.id,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);

            if (insertError) throw insertError;

            // revoke previews e resetar campos
            previews.forEach((p) => {
                try {
                    URL.revokeObjectURL(p.url);
                } catch (_) { }
            });

            setTitle('');
            setExcerpt('');
            setContent('');
            setFiles([]);
            setPreviews([]);
            if (inputRef.current) inputRef.current.value = '';
            navigate('/');
        } catch (err: any) {
            console.error(err);
            setError(err?.message ?? 'Erro ao criar post.');
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

                    {/* previews */}
                    <div className="file-preview-grid">
                        {previews.map((p, i) => (
                            <div key={p.id} className="file-preview-card">
                                {p.type.startsWith('image/') ? (
                                    <img src={p.url} alt={p.name} />
                                ) : p.type.startsWith('video/') ? (
                                    <video src={p.url} controls />
                                ) : (
                                    <div className="file-generic">
                                        <div className="file-icon">📄</div>
                                        <div className="file-meta">
                                            <div className="file-name">{p.name}</div>
                                            <div className="file-size">{formatBytes(p.size)}</div>
                                        </div>
                                    </div>
                                )}
                                <button type="button" className="remove-file-btn" onClick={() => handleRemoveFile(i)}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div className="file-upload-container">
                        <input
                            ref={inputRef}
                            type="file"
                            accept="*/*"
                            multiple
                            onChange={handleFileChange}
                            id="fileInput"
                            className="file-input"
                        />
                        <label htmlFor="fileInput" className="file-label">
                            📁 Selecionar arquivos
                        </label>

                        {files.length > 0 && (
                            <p className="file-count">{files.length} arquivo(s) selecionado(s) (máx {MAX_FILES})</p>
                        )}
                    </div>

                    {error && <p className="error">{error}</p>}

                    <button type="submit" disabled={uploading}>
                        {uploading ? 'Publicando...' : 'Publicar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
