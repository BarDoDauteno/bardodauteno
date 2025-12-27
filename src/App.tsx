// App.tsx
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
//import Retrospective from './components/retrospective/Retrospective';

import WrappedPage from './pages/WrappedPage';


// Componente principal envolvendo AuthProvider
function AppContent() {
  const { user } = useAuth(); // ← Use o user do AuthContext
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Erro ao buscar sessão:', error.message);
          setIsLoading(false);
          return;
        }

        const session = data?.session;
        const email = session?.user?.email ?? null;
        

        // Verifica se o email está na tabela admins
        if (email) {
          const { data: admin, error: adminError } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .single();

          if (adminError) {
            console.warn('Usuário não é admin ou houve erro:', adminError.message);
            setAdminEmail(null);
          } else if (admin) {
            setAdminEmail(email);
          }
        } else {
          setAdminEmail(null);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setIsLoading(false);
      }
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

  // Se estiver carregando, mostra um loading básico
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router basename="/bardodauteno">
      <main className="min-h-screen">
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
          
          {/* ROTA DA RETROSPECTIVA */}
          <Route path="/wrapped" element={<WrappedPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BottomNav />
    </Router>
  );
}

// App principal
export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}