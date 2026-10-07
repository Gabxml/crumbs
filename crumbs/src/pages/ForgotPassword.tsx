import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { forgotPassword } from '../lib/auth'

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setBusy(true)
    setError(null)
    try {
      await forgotPassword(trimmed)
      // The server answers the same way for an unknown address, on purpose, so
      // this screen cannot be used to find out who has an account.
      setSent(true)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not send a link. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <section className="space-y-6">
        <h1 className="text-4xl font-heading text-text-h">Check your email</h1>
        <p className="text-text">
          If <strong>{email.trim()}</strong> has an account, a reset link is on its way. It
          works once and expires in an hour.
        </p>
        <p className="text-text">
          Nothing there? Check the spelling, or try another address.
        </p>
        <p className="text-text">
          <Link to="/login" className="text-accent underline">
            Back to sign in
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-heading text-text-h">Forgot password</h1>

      <p className="text-text">
        Enter your email address and we will send you a link to choose a new one.
      </p>

      <form onSubmit={submit} className="space-y-4 text-left" noValidate>
        <div className="space-y-1">
          <label htmlFor="forgot-email" className="block font-heading text-text-h">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-accent">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50"
          >
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
          <Link
            to="/login"
            className="rounded-md border border-border px-4 py-2 font-heading text-text-h"
          >
            Back to sign in
          </Link>
        </div>
      </form>
    </section>
  )
}
