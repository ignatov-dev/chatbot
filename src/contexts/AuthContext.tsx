import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import { fetchUsers, type AdminUser } from '../services/adminUsers'
import { fetchAllPermissions, type RolePermission } from '../services/permissions'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
  userRole: string | null
  allowedSources: string[]
  maxShareHours: number | null
  canEditPermissions: boolean
  allPermissions: RolePermission[]
  refetchPermissions: () => void
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

function notifyAuth(type: 'signup' | 'signin', email: string, provider: string) {
  if (import.meta.env.VITE_SLACK_NOTIFICATIONS !== 'true') return
  supabase.functions.invoke('notify-auth', {
    body: { type, email, provider, origin: window.location.origin },
  }).catch(() => { /* fire-and-forget */ })
}

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
      (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (event === 'SIGNED_IN' && session?.user?.app_metadata?.provider === 'google') {
          notifyAuth('signin', session.user.email ?? '', 'google')
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (!error) notifyAuth('signup', email, 'email')
    return {
      error: error?.message ?? null,
      confirmationRequired: !error && !data.session,
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) notifyAuth('signin', email, 'email')
    return { error: error?.message ?? null }
  }

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const userRole = (user?.app_metadata?.user_role as string) ?? null
  const isAdmin = userRole === 'admin' || userRole === 'manager'

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

  const [allowedSources, setAllowedSources] = useState<string[]>([])
  const [maxShareHours, setMaxShareHours] = useState<number | null>(null)
  const [canEditPermissions, setCanEditPermissions] = useState(false)
  const [allPermissions, setAllPermissions] = useState<RolePermission[]>([])

  const loadPermissions = useCallback(() => {
    fetchAllPermissions()
      .then((rows) => {
        setAllPermissions(rows)
        const myRole = userRole ?? 'user'
        const myPerms = rows.find((r) => r.role === myRole)
        if (myPerms) {
          setAllowedSources(myPerms.allowed_sources)
          setMaxShareHours(myPerms.max_share_hours)
          setCanEditPermissions(myPerms.can_edit_permissions)
        }
      })
      .catch(console.error)
  }, [userRole])

  useEffect(() => {
    if (user) loadPermissions()
  }, [user, loadPermissions])

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, userRole, allowedSources, maxShareHours, canEditPermissions, allPermissions, refetchPermissions: loadPermissions, adminUsers, adminUsersLoading, adminUsersError, refetchAdminUsers: loadAdminUsers, setAdminUsers, signUp, signIn, signInWithGoogle, signOut }}>
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
