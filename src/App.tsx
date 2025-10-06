import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import supabase from './utils/supabase'

import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import CreatePost from './pages/CreatePost'
import PostPage from './pages/PostPage'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import { AuthProvider } from './context/AuthContext';

export default function App() {
  const [adminEmail, setAdminEmail] = useState<string | null>(null)

  useEffect(() => {
    const checkSession = async () => {
      // Busca a sessão atual
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Erro ao buscar sessão:', error.message)
        return
      }

      const session = data?.session
      const email = session?.user?.email ?? null

      if (!email) {
        setAdminEmail(null)
        return
      }

      // Verifica se o email está na tabela admin
      const { data: admin, error: adminError } = await supabase
        .from('admin')
        .select('*')
        .eq('email', email)
        .single()

      if (adminError) {
        console.warn('Usuário não é admin ou houve erro:', adminError.message)
        setAdminEmail(null)
        return
      }

      if (admin) setAdminEmail(email)
    }

    checkSession()

    // Escuta mudanças no estado de autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkSession()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthProvider>
      <Router basename="/bardodauteno">
        <Header adminEmail={adminEmail} />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            {adminEmail && <Route path="/create" element={<CreatePost />} />}
            <Route path="/post/:id" element={<PostPage />} />
            <Route path="*" element={<NotFound />} />
            <Route path="/login" element={<Login />} />
            <Route path="/create-post" element={<CreatePost />} />

          </Routes>
        </main>
        <Footer />
      </Router>
    </AuthProvider>
  )
}
