import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

/** localStorage can throw in private browsing and when storage is disabled. */
const KEY = 'crumbs:theme'

export function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function writeStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // A theme that cannot be remembered still applies for this session.
  }
}

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)

  if (!context) {
    throw new Error('useTheme must be used inside a ThemeProvider')
  }

  return context
}
