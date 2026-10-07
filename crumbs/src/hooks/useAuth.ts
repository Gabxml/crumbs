import { createContext, useContext } from 'react'
import type { RegisterResult } from '../lib/auth'
import type { LoginInput, RegisterInput, User } from '../lib/schemas'

export interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (input: LoginInput) => Promise<User>
  register: (input: RegisterInput) => Promise<RegisterResult>
  logout: () => Promise<void>
  updateUser: (user: User) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider')
  }

  return context
}