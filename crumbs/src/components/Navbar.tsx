import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Folder } from '@untitledui/icons/Folder'
import { Image01 } from '@untitledui/icons/Image01'
import { SearchLg } from '@untitledui/icons/SearchLg'
import { User01 } from '@untitledui/icons/User01'
import { UserPlus01 } from '@untitledui/icons/UserPlus01'
import { useAuth } from '../hooks/useAuth'
import { profilePath } from '../lib/people'
import { focusRing, pressable } from '../lib/ui'
import Avatar from './Avatar'
import ThemeToggle from './ThemeToggle'

type Tab = { to: string; label: string; icon: ReactNode }

function tabSet(signedIn: boolean): Tab[] {
  if (!signedIn) {
    return [
      { to: '/login', label: 'Log in', icon: <User01 size={22} strokeWidth={1.75} /> },
      { to: '/register', label: 'Sign up', icon: <UserPlus01 size={22} strokeWidth={1.75} /> },
    ]
  }

  return [
    { to: '/collections', label: 'Collections', icon: <Folder size={20} strokeWidth={1.75} /> },
    { to: '/crumbs', label: 'Crumbs', icon: <Image01 size={20} strokeWidth={1.75} /> },
    { to: '/search', label: 'Search', icon: <SearchLg size={20} strokeWidth={1.75} /> },
    { to: '/profile', label: 'Profile', icon: <User01 size={20} strokeWidth={1.75} /> },
  ]
}

export default function Navbar() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  // Rendering one set of links and then swapping it would flash the wrong ones
  // on every reload, so wait for the session to resolve.
  if (loading) return null

  const tabs = tabSet(Boolean(user))

  // Nested routes such as /collections/:id should keep "Collections" lit, so a
  // tab matches on the start of the path rather than on exact equality. The
  // exception is "/", which would otherwise swallow every path.
  const isActive = (to: string) =>
    to === '/profile' ? pathname.startsWith('/u/') || pathname === '/profile' : pathname.startsWith(to)

  return (
    <>
      {/* Desktop: a floating squircle pill rather than a bar pinned to the
          window edge, so the grey canvas stays visible around it. The header
          itself carries the page gutters and must be the sticky element — a
          sticky child of a short wrapper would only stick for the wrapper's own
          height. */}
      <header className="sticky top-3 z-30 hidden px-4 py-3 lg:block lg:px-6">
        <div className="flex items-center justify-between gap-4 rounded-full bg-surface/80 px-3 py-2 shadow-float backdrop-blur-xl">
          <Link
            to="/"
            className={`rounded-full px-3 py-1.5 text-[17px] font-semibold tracking-heading text-text-h no-underline ${focusRing} ${pressable}`}
          >
            Crumbs
          </Link>

          <nav aria-label="Main">
            <ul className="flex items-center gap-1">
              {tabs.map(({ to, label, icon }) => {
                const active = isActive(to)

                return (
                  <li key={to}>
                    <Link
                      to={to}
                      aria-current={active ? 'page' : undefined}
                      className={`flex items-center gap-2 rounded-full px-3 py-2 text-[15px] font-medium ${
                        active ? 'bg-accent-tint text-accent' : 'text-text hover:bg-fill'
                      } ${focusRing} ${pressable}`}
                    >
                      <span className={active ? 'text-accent' : 'text-inactive'}>{icon}</span>
                      {label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <Link
                to={profilePath(user.username)}
                aria-label="Your profile"
                className={`rounded-full ${focusRing} ${pressable}`}
              >
                <div className="size-9">
                  <Avatar user={user} />
                </div>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile: a bottom tab bar, floating with the canvas showing beneath. */}
      {/* pb-[max] keeps the bar clear of the home indicator on iOS while still
          floating above the canvas rather than sitting flat against the edge. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="flex items-stretch justify-around gap-1 rounded-card bg-surface/80 px-2 py-2 shadow-float backdrop-blur-xl">
          {tabs.map(({ to, label, icon }) => {
            const active = isActive(to)

            return (
              <li key={to} className="flex-1">
                <Link
                  to={to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-1 rounded-full px-1 py-1.5 text-[11px] font-medium ${
                    active ? 'text-accent' : 'text-inactive'
                  } ${focusRing} ${pressable}`}
                >
                  <span className={active ? 'text-accent' : 'text-inactive'}>{icon}</span>
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}