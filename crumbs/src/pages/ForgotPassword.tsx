import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { forgotPassword } from '../lib/auth'
import Button, { ButtonLink } from '../components/Button'
import Card from '../components/Card'
import Field from '../components/Field'

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
      <section className="mx-auto max-w-md space-y-6">
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
          Check your email
        </h1>

        <Card className="space-y-4">
          <p className="text-[15px] text-text">
            If <strong>{email.trim()}</strong> has an account, a reset link is on its way. It
            works once and expires in an hour.
          </p>
          <p className="text-[15px] text-text">
            Nothing there? Check the spelling, or try another address.
          </p>
        </Card>

        <p className="text-[15px] text-text">
          <Link to="/login" className="rounded text-accent underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
        Forgot password
      </h1>

      <p className="text-[15px] text-text">
        Enter your email address and we will send you a link to choose a new one.
      </p>

      <Card>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {error && (
            <p role="alert" className="text-[15px] text-danger">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy || !email.trim()}>
              {busy ? 'Sending…' : 'Send reset link'}
            </Button>
            <ButtonLink to="/login" variant="secondary">
              Back to sign in
            </ButtonLink>
          </div>
        </form>
      </Card>
    </section>
  )
}
