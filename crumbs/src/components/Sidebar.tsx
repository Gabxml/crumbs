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
import SignOutButton from './SignOutButton'
import ThemeToggle from './ThemeToggle'
import Wordmark from './Wordmark'

type Tab = { to: string; label: string; icon: ReactNode }

const SIGNED_OUT: Tab[] = [
  { to: '/login', label: 'Log in', icon: <User01 size={22} strokeWidth={1.75} /> },
  { to: '/register', label: 'Sign up', icon: <UserPlus01 size={22} strokeWidth={1.75} /> },
]

// Signed in, the middle of the rail is the three places there is something to
// go. Your own profile is not one of them — it is your face at the bottom, next
// to the way out, which is where you expect to find yourself and the exit.
function railTabs(): Tab[] {
  return [
    { to: '/collections', label: 'Collections', icon: <Folder size={20} strokeWidth={1.75} /> },
    { to: '/crumbs', label: 'Crumbs', icon: <Image01 size={20} strokeWidth={1.75} /> },
    { to: '/search', label: 'Search', icon: <SearchLg size={20} strokeWidth={1.75} /> },
  ]
}

// The phone bar has no bottom cluster to put your profile in, so it keeps
// carrying the link itself — otherwise signing in on a phone would leave no way
// to your own profile or out of the app at all.
function mobileTabs(): Tab[] {
  return [...railTabs(), { to: '/profile', label: 'Profile', icon: <User01 size={20} strokeWidth={1.75} /> }]
}

/**
 * The app's one navigation surface: a rail down the left on a desktop, and a
 * bottom tab bar on a phone.
 *
 * A sidebar is the right shape for a list of destinations you move between, but
 * it is a poor shape for a thumb — a rail down the edge is out of reach of the
 * hand holding the phone and takes a fifth of a narrow screen to say "Crumbs".
 * So the phone keeps the tab bar and the rail takes over where there is room for
 * it.
 */
export default function Sidebar() {
  const { user, loading } = useAuth()
  const { pathname } = useLocation()

  // Rendering one set of links and then swapping it would flash the wrong ones
  // on every reload, so wait for the session to resolve.
  if (loading) return null

  const tabs = user ? railTabs() : SIGNED_OUT
  const tabsMobile = user ? mobileTabs() : SIGNED_OUT

  // Nested routes such as /collections/:id should keep "Collections" lit, so a
  // tab matches on the start of the path rather than on exact equality. The
  // exception is "/", which would otherwise swallow every path.
  const isActive = (to: string) =>
    to === '/profile' ? pathname.startsWith('/u/') || pathname === '/profile' : pathname.startsWith(to)

  return (
    <>
      {/* Desktop: a rail pinned to the left. It is a flex child rather than a
          fixed element so the content column beside it decides its own width,
          and sticky so the rail stays put while the page scrolls under it.
          The frosted surface is the same one the bottom cluster sits on, so the
          whole rail reads as one material rather than a cluster that happens to
          be floating on a bare one — which also means the canvas, which runs
          the full width of the window, passes behind it instead of showing
          through.

          The divider is a themed token, not a palette colour: a fixed one keeps
          its light-mode value in dark mode and draws a white line down the edge
          of a near-black rail. The surfaces are solid rather than frosted — the
          blur only ever showed where the full-width canvas passed behind, and a
          flat panel is one less thing to read as depth. */}
      <header className="sticky top-0 z-30 hidden h-svh w-60 shrink-0 flex-col gap-3 self-start border-r-2 border-code-bg bg-surface px-4 py-5 shadow-xl lg:flex">
        <Wordmark className="w-[124px] px-3 py-2" />

        {/* flex-1 with items-start: the destinations stay a short list at the
            top rather than spreading down the whole rail. */}
        <nav aria-label="Main" className="flex flex-1 items-start">
          <ul className="flex w-full flex-col gap-1">
            {tabs.map(({ to, label, icon }) => {
              const active = isActive(to)

              return (
                <li key={to}>
                  <Link
                    to={to}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2.5 rounded-control px-3 py-2.5 text-[15px] font-medium ${
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

        {/* You, the theme, and the way out — the three things that are about this
            session rather than about a page. */}
        <div className="flex items-center gap-1 rounded-full bg-surface px-2 py-1.5 shadow-float">
          {user ? (
            <Link
              to={profilePath(user.username)}
              className={`flex flex-1 items-center gap-2 rounded-full py-0.5 pr-2 pl-0.5 ${focusRing} ${pressable}`}
            >
              <div className="size-9 shrink-0">
                <Avatar user={user} />
              </div>
              <span className="min-w-0 truncate text-[14px] font-medium text-text-h max-w-12">
                {user.username}
              </span>
            </Link>
          ) : (
            <span className="flex-1 px-2 text-[14px] text-text">Not signed in</span>
          )}

          <ThemeToggle />
          {user && <SignOutButton />}
        </div>
      </header>

      {/* Mobile: a bottom tab bar, floating with the canvas showing beneath. */}
      {/* pb-[max] keeps the bar clear of the home indicator on iOS while still
          floating above the canvas rather than sitting flat against the edge. */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="flex items-stretch justify-around gap-1 rounded-card bg-surface px-2 py-2 shadow-float">
          {tabsMobile.map(({ to, label, icon }) => {
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