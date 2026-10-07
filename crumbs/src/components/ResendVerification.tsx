import { useState } from 'react'
import { ApiError } from '../lib/api'
import { resendVerification } from '../lib/auth'

// Asking for a new confirmation link. The server always answers the same way,
// whether or not the address is on file, so this cannot be used to probe.
export default function ResendVerification({ email }: { email: string }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      await resendVerification(email)
      setDone(true)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not send another link. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2 text-left">
      {done ? (
        <p role="status" className="text-sm text-text">
          If that account exists, a new link is on its way.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy}
          className="rounded-md border border-border px-4 py-2 font-heading text-text-h disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send another link'}
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  )
}
