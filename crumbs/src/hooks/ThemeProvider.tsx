import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { readStoredTheme, writeStoredTheme } from './useTheme'
import { ThemeContext } from './useTheme'
import type { Theme, ThemeContextValue } from './useTheme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

// index.html applies the same logic before first paint so the page never flashes
// the wrong palette on load. Reading the attribute back rather than recomputing
// keeps this in agreement with whatever that script decided, including the case
// where the user has an explicit choice stored.
function currentTheme(): Theme {
  const stored = readStoredTheme()
  if (stored) return stored

  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(currentTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  // With no stored choice the app keeps following the system, so switching the
  // appearance in OS settings repaints a tab that is already open.
  useEffect(() => {
    if (readStoredTheme()) return

    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setThemeState(event.matches ? 'dark' : 'light')

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const setTheme = useCallback((next: Theme) => {
    writeStoredTheme(next)
    setThemeState(next)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
    [theme, setTheme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
