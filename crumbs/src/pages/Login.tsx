import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '../lib/api'
import { UnverifiedEmailError } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import ResendVerification from '../components/ResendVerification'
import { loginSchema } from '../lib/schemas'
import type { LoginInput } from '../lib/schemas'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  // Set when the password was right but the address is not confirmed, so the
  // page can offer another link instead of a dead end.
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginInput) => {
    setFormError(null)
    setUnconfirmedEmail(null)
    try {
      await login(values)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (error) {
      if (error instanceof UnverifiedEmailError) {
        setUnconfirmedEmail(values.email.trim())
        return
      }
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fields)) {
          if (field === 'email' || field === 'password') {
            setError(field, { message: messages[0] })
          }
        }
        if (Object.keys(error.fields).length === 0) {
          setFormError(error.message)
        }
        return
      }
      setFormError('Something went wrong. Try again.')
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-heading text-text-h">Login</h1>

      {unconfirmedEmail ? (
        <div className="space-y-3 rounded-md border border-border p-4 text-left">
          <p role="alert" className="text-accent">
            Confirm your email address before signing in.
          </p>
          <p className="text-sm text-text">
            Open the link we sent to {unconfirmedEmail}, or ask for another one.
          </p>
          <ResendVerification email={unconfirmedEmail} />
        </div>
      ) : (
        formError && (
          <p role="alert" className="text-accent">
            {formError}
          </p>
        )
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="email" className="block font-heading text-text-h">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent"
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-sm text-accent">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block font-heading text-text-h">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent"
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-sm text-accent">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="text-text">
        <Link to="/register" className="text-accent underline">
          Create an account
        </Link>
        {' · '}
        <Link to="/forgot-password" className="text-accent underline">
          Forgot password
        </Link>
      </p>
    </section>
  )
}
