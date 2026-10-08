import { useState } from 'react'
import { ApiError } from '../lib/api'
import { resendVerification } from '../lib/auth'
import Button from './Button'

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
    <div className="space-y-2">
      {done ? (
        <p role="status" className="text-[15px] text-text">
          If that account exists, a new link is on its way.
        </p>
      ) : (
        <Button variant="secondary" onClick={() => void send()} disabled={busy}>
          {busy ? 'Sending…' : 'Send another link'}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
