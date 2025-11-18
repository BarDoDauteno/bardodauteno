// src/components/BottomNav.tsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaHome, FaPlusCircle, FaUser, FaSignInAlt, FaSignOutAlt } from 'react-icons/fa';
import { GiDominoTiles } from 'react-icons/gi';
import supabase from '../utils/supabase';
import '../styles/BottomNav.css';

export default function BottomNav() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/');
    };

    const navItems = [
        { icon: <FaHome />, label: 'Home', path: '/' },
        user && { icon: <FaPlusCircle />, label: 'Criar', path: '/create-post' },
        { icon: <GiDominoTiles />, label: 'Dominó', path: '/domino' },
        user
            ? {
                icon: <FaSignOutAlt />,
                label: 'Sair',
                action: handleLogout
            }
            : {
                icon: <FaSignInAlt />,
                label: 'Entrar',
                path: '/login'
            },
    ].filter(Boolean);

    return (
        <nav className="bottom-nav">
            {navItems.map((item: any, index: number) => (
                <div
                    key={index}
                    className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    onClick={() => item.action ? item.action() : navigate(item.path)}
                >
                    <div className="nav-icon">
                        {item.icon}
                    </div>
                    <span className="nav-label">{item.label}</span>
                </div>
            ))}
        </nav>
    );
}