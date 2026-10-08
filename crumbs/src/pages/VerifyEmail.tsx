import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { verifyEmail } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import { ButtonLink } from '../components/Button'
import Card from '../components/Card'

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
          error instanceof ApiError ? error.message : 'Could not confirm that link.',
        )
      })
  }, [token, updateUser])

  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
        {state === 'done' ? 'Account confirmed' : 'Confirming your email'}
      </h1>

      {state === 'working' && (
        <p role="status" className="text-[15px] text-text">
          One moment…
        </p>
      )}

      {state === 'done' && (
        <Card className="space-y-4">
          <p className="text-[15px] text-text">
            Your address is confirmed and you are signed in.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink to="/collections">Go to collections</ButtonLink>
            <ButtonLink to="/crumbs" variant="secondary">
              My crumbs
            </ButtonLink>
          </div>
        </Card>
      )}

      {state === 'failed' && (
        <Card className="space-y-4">
          <p role="alert" className="text-[15px] text-danger">
            {message ?? 'That link is not valid or has expired.'}
          </p>
          <p className="text-[15px] text-text">
            Links work once and expire, so an old email may no longer be good. You can ask
            for a new one from the sign-in page.
          </p>
          <ButtonLink to="/login" variant="secondary">
            Back to sign in
          </ButtonLink>
        </Card>
      )}
    </section>
  )
}
