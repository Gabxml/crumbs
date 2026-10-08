import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '../lib/api'
import { resetPassword } from '../lib/auth'
import Button, { ButtonLink } from '../components/Button'
import Card from '../components/Card'
import Field from '../components/Field'
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
      <section className="mx-auto max-w-md space-y-6">
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
          Reset password
        </h1>

        <Card className="space-y-4">
          <p role="alert" className="text-[15px] text-danger">
            This link is incomplete. Use the link from your reset email.
          </p>
          <p className="text-[15px] text-text">
            <Link
              to="/forgot-password"
              className="rounded text-accent underline underline-offset-4"
            >
              Send a new link
            </Link>
          </p>
        </Card>
      </section>
    )
  }

  if (done) {
    return (
      <section className="mx-auto max-w-md space-y-6">
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
          Password changed
        </h1>

        <Card className="space-y-4">
          <p className="text-[15px] text-text">
            You can sign in with your new password now.
          </p>
          <ButtonLink to="/login">Sign in</ButtonLink>
        </Card>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
        Choose a new password
      </h1>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field
            label="New password"
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
            error={errors.newPassword?.message}
          />

          <Field
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
          />

          {formError && (
            <p role="alert" className="text-[15px] text-danger">
              {formError}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </Card>
    </section>
  )
}
