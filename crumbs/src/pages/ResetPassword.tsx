import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '../lib/api'
import { resetPassword } from '../lib/auth'
import { z } from 'zod'

const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(200, 'That password is too long'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type Values = z.infer<typeof passwordSchema>

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'

export default function ResetPassword() {
  // The token arrives in the emailed link.
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (values: Values) => {
    setBusy(true)
    setFormError(null)
    try {
      await resetPassword(token, values.newPassword)
      setDone(true)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 400) {
          setFormError(error.message)
          return
        }
        for (const [field, messages] of Object.entries(error.fields)) {
          if (field === 'newPassword' || field === 'confirmPassword') {
            setError(field, { message: messages[0] })
          }
        }
        if (Object.keys(error.fields).length === 0) setFormError(error.message)
        return
      }
      setFormError('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <section className="space-y-6">
        <h1 className="text-4xl font-heading text-text-h">Reset password</h1>
        <p role="alert" className="text-accent">
          This link is incomplete. Use the link from your reset email.
        </p>
        <p className="text-text">
          <Link to="/forgot-password" className="text-accent underline">
            Send a new link
          </Link>
        </p>
      </section>
    )
  }

  if (done) {
    return (
      <section className="space-y-6">
        <h1 className="text-4xl font-heading text-text-h">Password changed</h1>
        <p className="text-text">You can sign in with your new password now.</p>
        <Link
          to="/login"
          className="rounded-md bg-accent px-4 py-2 font-heading text-bg"
        >
          Sign in
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-heading text-text-h">Choose a new password</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-left" noValidate>
        <div className="space-y-1">
          <label htmlFor="new-password" className="block font-heading text-text-h">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            aria-invalid={Boolean(errors.newPassword)}
            aria-describedby={errors.newPassword ? 'new-password-error' : undefined}
            className={inputClass}
          />
          {errors.newPassword && (
            <p id="new-password-error" role="alert" className="text-sm text-accent">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="confirm-password" className="block font-heading text-text-h">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
            className={inputClass}
          />
          {errors.confirmPassword && (
            <p id="confirm-password-error" role="alert" className="text-sm text-accent">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-accent">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  )
}
