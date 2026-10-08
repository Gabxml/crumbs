import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '../lib/api'
import { UnverifiedEmailError } from '../lib/auth'
import { useAuth } from '../hooks/useAuth'
import ResendVerification from '../components/ResendVerification'
import Button from '../components/Button'
import Card from '../components/Card'
import Field from '../components/Field'
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
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">Log in</h1>

      <Card className="space-y-5">
        {unconfirmedEmail ? (
          <div className="space-y-3">
            <p role="alert" className="text-[15px] font-medium text-danger">
              Confirm your email address before signing in.
            </p>
            <p className="text-[15px] text-text">
              Open the link we sent to {unconfirmedEmail}, or ask for another one.
            </p>
            <ResendVerification email={unconfirmedEmail} />
          </div>
        ) : formError ? (
          <p role="alert" className="text-[15px] text-danger">
            {formError}
          </p>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            {...register('email')}
            error={errors.email?.message}
          />

          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Card>

      <p className="text-[15px] text-text">
        <Link
          to="/register"
          className="rounded text-accent underline underline-offset-4"
        >
          Create an account
        </Link>
        {' · '}
        <Link
          to="/forgot-password"
          className="rounded text-accent underline underline-offset-4"
        >
          Forgot password
        </Link>
      </p>
    </section>
  )
}
