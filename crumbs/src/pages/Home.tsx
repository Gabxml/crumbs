import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHealth } from '../lib/api'
import type { Health } from '../lib/schemas'

const navLinks = [
  { to: '/login', label: 'Login' },
  { to: '/register', label: 'Register' },
  { to: '/forgot-password', label: 'Forgot password' },
  { to: '/collections', label: 'Collections' },
  { to: '/search', label: 'Search' },
  { to: '/addevent', label: 'Add event' },
  { to: '/crumbs', label: 'Crumbs' },
  { to: '/profile', label: 'Profile' },
  { to: '/edit-profile', label: 'Edit profile' },
]

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchHealth()
      .then((data) => {
        if (!cancelled) setHealth(data)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-heading text-text-h">Crumbs</h1>

      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-accent">
            {error}
          </p>
        )}
        {!error && !health && <p className="text-text">Checking API…</p>}
        {health && (
          <p className="text-text">
            API {health.status} · database {health.database}
          </p>
        )}
      </div>

      <nav aria-label="Main">
        <ul className="grid gap-2 sm:grid-cols-2">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <Link to={to} className="text-accent underline">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}
