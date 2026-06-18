'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, ApiError, setAuthToken } from '@/lib/api'

export type User = {
  id: number
  email: string
  plan: string
  trial_ends_at: string | null
}

type AuthContextType = {
  user: User | null
  loading: boolean
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<User>('/auth/me')
      setUser(data)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    setAuthToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function isPro(user: User | null): boolean {
  if (!user) return false
  if (user.plan === 'pro' || user.plan === 'enterprise') return true
  if (user.trial_ends_at && new Date(user.trial_ends_at) > new Date()) return true
  return false
}
