import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { registerSchema } from '../lib/schemas'
import type { RegisterInput } from '../lib/schemas'

export default function Register() {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

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
      await registerUser(values)
      navigate('/', { replace: true })
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
