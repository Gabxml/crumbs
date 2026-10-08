import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchHealth } from '../lib/api'
import type { Health } from '../lib/schemas'
import Card from '../components/Card'
import { focusRing } from '../lib/ui'

const navLinks = [
  { to: '/login', label: 'Log in' },
  { to: '/register', label: 'Sign up' },
  { to: '/forgot-password', label: 'Forgot password' },
  { to: '/collections', label: 'Collections' },
  { to: '/search', label: 'Search' },
  { to: '/collections/new', label: 'New collection' },
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
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">Crumbs</h1>

      <Card>
        <div aria-live="polite" className="space-y-1">
          {error && (
            <p role="alert" className="text-[15px] text-danger">
              {error}
            </p>
          )}
          {!error && !health && <p className="text-[15px] text-text">Checking API…</p>}
          {health && (
            <p className="text-[15px] text-text">
              API {health.status} · database {health.database}
            </p>
          )}
        </div>
      </Card>

      <nav aria-label="Main">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navLinks.map(({ to, label }) => (
            <li key={to}>
              <Link
                to={to}
                className={`block rounded-card bg-surface px-5 py-4 text-[15px] font-medium text-text-h no-underline transition duration-200 ease-ios hover:brightness-[0.98] ${focusRing}`}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  )
}
