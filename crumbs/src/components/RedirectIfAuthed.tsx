import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

/**
 * Sends a signed-in visitor away from a page meant for signed-out ones.
 *
 * They land on their collections, which is the first page of the app that is
 * actually theirs — not on `/`, which is the landing page and is open to anyone.
 *
 * `from` still wins where it is set, so a deep link bounced to the login page
 * returns the person to whatever they were trying to reach.
 */
export default function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/collections'} replace />
  }

  return <>{children}</>
}
