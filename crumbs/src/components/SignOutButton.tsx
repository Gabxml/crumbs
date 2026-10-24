import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut01 } from '@untitledui/icons/LogOut01'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { focusRing, pressable } from '../lib/ui'
import Button from './Button'

/**
 * The way out of the app. Lives in the sidebar so it is reachable from anywhere,
 * and on your own profile so it is still findable from there.
 *
 * Signing out drops the session and sends you to the sign-in page; without that
 * the next protected route would bounce you to /login anyway, but doing it here
 * means the button does not appear to do nothing.
 */
export default function SignOutButton({
  variant = 'icon',
  className,
}: {
  /** `icon` for the sidebar cluster, `button` for the profile page. */
  variant?: 'icon' | 'button'
  className?: string
}) {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = async () => {
    setBusy(true)
    setError(null)
    try {
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not sign you out. Try again.',
      )
      setBusy(false)
    }
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={() => void signOut()}
          disabled={busy}
          aria-label="Sign out"
          title="Sign out"
          className={`grid size-10 shrink-0 place-items-center rounded-full text-text hover:bg-fill hover:text-danger disabled:opacity-40 ${focusRing} ${pressable} ${className ?? ''}`}
        >
          <LogOut01 size={20} strokeWidth={1.75} />
        </button>
        {error && (
          <span role="alert" className="sr-only">
            {error}
          </span>
        )}
      </>
    )
  }

  return (
    <div className="space-y-2">
      {/* Outlined rather than filled, so it reads as a control without adding a
          block to the profile, and in the danger colour because leaving is the
          one action on the page that is not undoable. */}
      <Button
        variant="outline-danger"
        onClick={() => void signOut()}
        disabled={busy}
        className={className}
      >
        <LogOut01 size={16} strokeWidth={1.75} />
        {busy ? 'Signing out…' : 'Sign out'}
      </Button>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
