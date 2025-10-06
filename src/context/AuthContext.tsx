// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import supabase from '../utils/supabase'

interface AuthContextType {
    user: { email: string; id: string } | null
    isAdmin: boolean
    loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<{ email: string; id: string } | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getSession = async () => {
            setLoading(true)
            const { data } = await supabase.auth.getSession()
            const sessionUser = data.session?.user

            if (sessionUser?.email && sessionUser?.id) {
                setUser({ email: sessionUser.email, id: sessionUser.id })
                const ADMIN_EMAILS = ['admin@exemplo.com']
                setIsAdmin(ADMIN_EMAILS.includes(sessionUser.email))
            } else {
                setUser(null)
                setIsAdmin(false)
            }
            setLoading(false)
        }

        getSession()

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.email && session.user.id) {
                setUser({ email: session.user.email, id: session.user.id })
                const ADMIN_EMAILS = ['admin@exemplo.com']
                setIsAdmin(ADMIN_EMAILS.includes(session.user.email))
            } else {
                setUser(null)
                setIsAdmin(false)
            }
        })

        return () => listener.subscription.unsubscribe()
    }, [])

    return (
        <AuthContext.Provider value={{ user, isAdmin, loading }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth must be used within AuthProvider')
    return context
}
