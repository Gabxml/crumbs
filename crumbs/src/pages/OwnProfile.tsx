import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Your own profile now lives at /u/<your username>, the same page everyone
// else's does, with the edit controls shown only when it is you. This keeps the
// old /profile link working instead of 404ing.
export default function OwnProfile() {
  const { user } = useAuth()

  if (!user) return null
  return <Navigate to={`/u/${encodeURIComponent(user.username)}`} replace />
}
