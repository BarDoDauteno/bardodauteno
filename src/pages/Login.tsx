import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import supabase from '../utils/supabase'
import '../styles/Login.css'

export default function Login() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {



            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error || !data.user) {
                setError('E-mail ou senha inválidos.')
                setLoading(false)
                return
            }

            // Aqui não chamamos mais setUser nem setIsAdmin
            // O AuthContext vai atualizar automaticamente via onAuthStateChange
            navigate('/')
        } catch (err) {
            console.error(err)
            setError('Erro inesperado ao logar.')
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="login-container">
            <div className="login-box glass-box">
                <h2>Entrar</h2>
                <h6>Somente Para Admins</h6>
                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                    </button>
                    {error && <p className="error">{error}</p>}
                </form>

            </div>
        </div>
    )
}
