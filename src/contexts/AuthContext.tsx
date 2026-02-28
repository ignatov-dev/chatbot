import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { fetchUsers, type AdminUser } from '../services/adminUsers'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  adminUsers: AdminUser[]
  adminUsersLoading: boolean
  adminUsersError: string | null
  refetchAdminUsers: () => void
  setAdminUsers: (users: AdminUser[]) => void
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirmationRequired: boolean }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    return {
      error: error?.message ?? null,
      confirmationRequired: !error && !data.session,
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const isAdmin = user?.app_metadata?.user_role === 'admin'

  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([])
  const [adminUsersLoading, setAdminUsersLoading] = useState(false)
  const [adminUsersError, setAdminUsersError] = useState<string | null>(null)

  const loadAdminUsers = useCallback(() => {
    setAdminUsersLoading(true)
    setAdminUsersError(null)
    fetchUsers()
      .then(setAdminUsers)
      .catch((err) => setAdminUsersError(err.message))
      .finally(() => setAdminUsersLoading(false))
  }, [])

  useEffect(() => {
    if (isAdmin) loadAdminUsers()
  }, [isAdmin, loadAdminUsers])

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, adminUsers, adminUsersLoading, adminUsersError, refetchAdminUsers: loadAdminUsers, setAdminUsers, signUp, signIn, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function useIsAdmin(): boolean {
  const { isAdmin } = useAuth()
  return isAdmin
}
