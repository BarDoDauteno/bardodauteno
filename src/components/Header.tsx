// src/components/Header.tsx
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.css';

export default function Header() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/logout`, {
                method: 'POST',
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${localStorage.getItem('sb-access-token')}`
                }
            });
            localStorage.removeItem('sb-access-token');
            navigate('/login');
        } catch (err) {
            console.error('Erro ao sair:', err);
        }
    };

    return (
        <header className="header-container">
            <div className="logo">
                <Link to="/">BardoDauteno</Link>
            </div>
            <nav>
                <ul className="nav-links">
                    <li><Link to="/">Home</Link></li>
                    {user && <li><Link to="/create-post">Criar Post</Link></li>} {/* Sempre visível para usuários logados */}
                    {user ? (
                        <>
                            <li><span>{user.email}</span></li>
                            <li><button onClick={handleLogout}>Sair</button></li>
                        </>
                    ) : (
                        <li><Link to="/login">Entrar</Link></li>
                    )}
                </ul>
            </nav>
        </header>
    );
}
