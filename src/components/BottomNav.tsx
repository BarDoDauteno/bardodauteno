
// src/components/BottomNav.tsx
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaPlusCircle, FaUser, FaSignOutAlt, FaSignInAlt } from 'react-icons/fa';
import { GiDominoTiles } from 'react-icons/gi'; // ícone de dominó
import '../styles/BottomNav.css';

export default function BottomNav() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        try {
            await fetch(`${import.meta.env.VITE_SUPABASE_URL} /auth/v1 / logout`, {
                method: 'POST',
                headers: {
                    apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${localStorage.getItem('sb-access-token')} `,
                },
            });
            localStorage.removeItem('sb-access-token');
            navigate('/login');
        } catch (err) {
            console.error('Erro ao sair:', err);
        }
    };

    const navItems = [
        { icon: <FaHome />, label: 'Home', path: '/' },
        user && { icon: <FaPlusCircle />, label: 'Criar', path: '/create-post' },
        // novo item: Domino
        { icon: <GiDominoTiles />, label: 'Dominó', path: '/domino' },
        user ? { icon: <FaSignOutAlt />, label: 'Sair', action: handleLogout } : { icon: <FaSignInAlt />, label: 'Entrar', path: '/login' },
        user && { icon: <FaUser />, label: 'Perfil', path: `/perfil/${user.id}` },
    ].filter(Boolean);

    return (
        <nav className="bottom-nav">
            {navItems.map((item: any, index: number) => (
                <div
                    key={index}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''} `}
                    onClick={() => item.action ? item.action() : navigate(item.path)}
                >
                    <div className="nav-icon">
                        {item.icon}
                    </div>
                    <span className="nav-label">{item.label}</span>

                    <span>{item.label}</span>
                </div>
            ))}
        </nav>
    );
}

