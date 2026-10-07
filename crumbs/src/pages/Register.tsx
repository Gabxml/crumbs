import { useState } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import ResendVerification from '../components/ResendVerification'
import { registerSchema } from '../lib/schemas'
import type { RegisterInput } from '../lib/schemas'

export default function Register() {
  const { register: registerUser } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)

  // The account exists but nobody is signed in yet, so this is a holding
  // screen: "go and open the email" rather than a page that needs the session.
  const [created, setCreated] = useState<{ email: string; emailSent: boolean } | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '' },
  })

  const onSubmit = async (values: RegisterInput) => {
    setFormError(null)
    try {
      const result = await registerUser(values)
      setCreated({ email: values.email.trim(), emailSent: result.verificationEmailSent })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fields)) {
          if (field === 'username' || field === 'email' || field === 'password') {
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

  const fieldProps = (field: 'username' | 'email' | 'password') => ({
    id: field,
    ...register(field),
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
    className:
      'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent',
  })

  if (created) {
    return (
      <section className="space-y-6">
        <h1 className="text-4xl font-heading text-text-h">Check your email</h1>

        <p className="text-text">
          {created.emailSent ? (
            <>
              We sent a confirmation link to <strong>{created.email}</strong>. Open it to
              finish setting up your account.
            </>
          ) : (
            <>
              Your account was created, but the confirmation email could not be sent.
              Nothing is lost — ask for another link below.
            </>
          )}
        </p>
        <p className="text-text">
          The link works once and expires in 24 hours. Until you use it you cannot sign in.
        </p>

        <ResendVerification email={created.email} />

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
      <h1 className="text-4xl font-heading text-text-h">Register</h1>

      {formError && (
        <p role="alert" className="text-accent">
          {formError}
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="username" className="block font-heading text-text-h">
            Username
          </label>
          <input
            {...fieldProps('username')}
            autoComplete="username"
            type="text"
          />
          {errors.username && (
            <p id="username-error" role="alert" className="text-sm text-accent">
              {errors.username.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block font-heading text-text-h">
            Email
          </label>
          <input
            {...fieldProps('email')}
            autoComplete="email"
            type="email"
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
            {...fieldProps('password')}
            autoComplete="new-password"
            type="password"
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
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="text-text">
        <Link to="/login" className="text-accent underline">
          Already have an account?
        </Link>
      </p>
    </section>
  )
}
