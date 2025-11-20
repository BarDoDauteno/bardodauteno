import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import supabase from './utils/supabase';

import Footer from './components/Footer';
import Home from './pages/Home';
import CreatePost from './pages/CreatePost';
import PostPage from './pages/PostPage';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './context/AuthContext';
import AllPosts from './pages/AllPosts';
import BottomNav from './components/BottomNav';
import DominoPage from './pages/DominoPage';
import CreateMatch from './pages/domino/CreateMatch';
import MatchPage from './pages/domino/MatchPage';
import Profile from './pages/Profile';
import JokesPage from './pages/JokesPage';
import MemoriesPage from './pages/MemoriesPage';
import DominoAnalytics from './pages/domino/DominoAnalytics';



// App.tsx - versão simplificada
export default function App() {
  const { user } = useAuth(); // ← Use o user do AuthContext

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Erro ao buscar sessão:', error.message);
        return;
      }

      const session = data?.session;
      const email = session?.user?.email ?? null;

      // Não precisa setUser aqui, o AuthContext já cuida disso



      // Verifica se o email está na tabela admins
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('email', email)
        .single();

      if (adminError) {
        console.warn('Usuário não é admin ou houve erro:', adminError.message);
        setAdminEmail(null);
        return;
      }

      if (admin) setAdminEmail(email);
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthProvider>
      <Router basename="/bardodauteno">
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/create-post" element={<CreatePost />} />
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="/all-posts" element={<AllPosts />} />
            <Route path="/memories" element={<MemoriesPage />} />
            <Route path="/jokes" element={<JokesPage />} />
            <Route path="/domino" element={<DominoPage />} />
            {user && <Route path="/domino/create" element={<CreateMatch />} />}
            {user && <Route path="/domino/analytics" element={<DominoAnalytics />} />}
            <Route path="/domino/:matchId" element={<MatchPage />} />
            <Route path="/perfil/:userId" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
        <BottomNav />
      </Router>
    </AuthProvider>
  );
}