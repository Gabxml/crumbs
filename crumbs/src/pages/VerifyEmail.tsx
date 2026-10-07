import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { verifyEmail } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'

// Landing page for the confirmation link in the email. Consuming the token signs
// the user in, since clicking the link is the proof that the address is theirs.
export default function VerifyEmail() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const { updateUser } = useAuth()
  const [state, setState] = useState<'working' | 'done' | 'failed'>(
    token ? 'working' : 'failed',
  )
  const [message, setMessage] = useState<string | null>(null)

  // A ref, not state: the effect must run once. Re-running it would spend the
  // single-use token and then report it as already used.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true

    verifyEmail(token)
      .then((user) => {
        updateUser(user)
        setState('done')
      })
      .catch((error: unknown) => {
        setState('failed')
        setMessage(
          error instanceof ApiError
            ? error.message
            : 'Could not confirm that link.',
        )
      })
  }, [token, updateUser])

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-heading text-text-h">
        {state === 'done' ? 'Account confirmed' : 'Confirming your email'}
      </h1>

      {state === 'working' && (
        <p role="status" className="text-text">
          One moment…
        </p>
      )}

      {state === 'done' && (
        <>
          <p className="text-text">Your address is confirmed and you are signed in.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/collections" className="rounded-md bg-accent px-4 py-2 font-heading text-bg">
              Go to collections
            </Link>
            <Link to="/crumbs" className="rounded-md border border-border px-4 py-2 font-heading text-text-h">
              My crumbs
            </Link>
          </div>
        </>
      )}

      {state === 'failed' && (
        <>
          <p role="alert" className="text-accent">
            {message ?? 'That link is not valid or has expired.'}
          </p>
          <p className="text-text">
            Links work once and expire, so an old email may no longer be good. You can ask
            for a new one from the sign-in page.
          </p>
          <Link
            to="/login"
            className="rounded-md border border-border px-4 py-2 font-heading text-text-h"
          >
            Back to sign in
          </Link>
        </>
      )}
    </section>
  )
}
