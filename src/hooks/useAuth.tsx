import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@/api/client'

type User = { id: number; name: string | null; email: string | null; phone: string | null; photo: string | null; role: 'admin' | 'developer' | 'driver' | 'passenger' }

type AuthContextType = {
  user: User | null
  token: string | null
  login: (token: string, user: User) => void
  logout: () => Promise<void>
  hydrated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const t = localStorage.getItem('admin_token')
    const u = localStorage.getItem('admin_user')
    if (t && u) {
      setToken(t)
      setUser(JSON.parse(u))
    }
    setHydrated(true)
  }, [])

  const login = (t: string, u: User) => {
    setToken(t)
    setUser(u)
    localStorage.setItem('admin_token', t)
    localStorage.setItem('admin_user', JSON.stringify(u))
  }

  const logout = async () => {
    const t = localStorage.getItem('admin_token')
    if (t) {
      try {
        await api.post('/api/admin/logout')
      } catch {
        /* invalider le token local même si l'API échoue */
      }
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
  }

  const value = useMemo(() => ({ user, token, login, logout, hydrated }), [user, token, hydrated])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
