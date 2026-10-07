import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  fetchMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from '../lib/auth'
import type { RegisterResult } from '../lib/auth'
import type { LoginInput, RegisterInput, User } from '../lib/schemas'
import { AuthContext } from './useAuth'
import type { AuthContextValue } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (input: LoginInput) => {
    const me = await loginRequest(input)
    setUser(me)
    return me
  }, [])

  // No setUser here on purpose: registration does not sign you in, the user has
  // to confirm their address first.
  const register = useCallback(
    async (input: RegisterInput): Promise<RegisterResult> => registerRequest(input),
    [],
  )

  const logout = useCallback(async () => {
    await logoutRequest()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, logout, updateUser: setUser }),
    [user, loading, login, register, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}