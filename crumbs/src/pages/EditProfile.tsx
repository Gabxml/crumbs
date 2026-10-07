import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import Avatar from '../components/Avatar'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import { resizeToSquare } from '../lib/image'
import {
  changePassword,
  removeAvatar,
  updateProfile,
  uploadAvatar,
} from '../lib/profile'
import { passwordChangeSchema, profileSchema } from '../lib/schemas'
import type { PasswordChangeInput, ProfileInput, User } from '../lib/schemas'

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'
const buttonClass =
  'rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50'

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1 text-left">
      <label htmlFor={id} className="block font-heading text-text-h">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  )
}

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <div aria-live="polite" className="text-left">
      {error && (
        <p role="alert" className="text-accent">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-text-h">
          {success}
        </p>
      )}
    </div>
  )
}

function DetailsForm({ user }: { user: User }) {
  const { updateUser } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const toValues = (u: User): ProfileInput => ({
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    username: u.username,
    email: u.email,
  })

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: toValues(user),
  })

  const onSubmit = async (values: ProfileInput) => {
    setFormError(null)
    setSaved(null)
    try {
      const me = await updateProfile(values)
      updateUser(me)
      reset(toValues(me))
      setSaved('Profile saved.')
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fields)) {
          if (
            field === 'firstName' ||
            field === 'lastName' ||
            field === 'username' ||
            field === 'email'
          ) {
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="details-heading"
      className="space-y-4"
    >
      <h2 id="details-heading" className="text-left">
        Your details
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="firstName" label="First name" error={errors.firstName?.message}>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            {...register('firstName')}
            aria-invalid={Boolean(errors.firstName)}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            className={inputClass}
          />
        </Field>

        <Field id="lastName" label="Last name" error={errors.lastName?.message}>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            {...register('lastName')}
            aria-invalid={Boolean(errors.lastName)}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            className={inputClass}
          />
        </Field>
      </div>

      <Field id="username" label="Username" error={errors.username?.message}>
        <input
          id="username"
          type="text"
          autoComplete="username"
          {...register('username')}
          aria-invalid={Boolean(errors.username)}
          aria-describedby={errors.username ? 'username-error' : undefined}
          className={inputClass}
        />
      </Field>

      <Field id="email" label="Email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={inputClass}
        />
      </Field>

      <Feedback error={formError} success={saved} />

      <div className="text-left">
        <button type="submit" disabled={isSubmitting || !isDirty} className={buttonClass}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordChangeInput>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })

  const onSubmit = async (values: PasswordChangeInput) => {
    setFormError(null)
    setSaved(null)
    try {
      await changePassword(values)
      reset()
      setSaved('Password changed.')
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, messages] of Object.entries(error.fields)) {
          if (field === 'currentPassword' || field === 'newPassword') {
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
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-labelledby="password-heading"
      className="space-y-4"
    >
      <h2 id="password-heading" className="text-left">
        Change password
      </h2>

      <Field id="currentPassword" label="Current password" error={errors.currentPassword?.message}>
        <input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register('currentPassword')}
          aria-invalid={Boolean(errors.currentPassword)}
          aria-describedby={errors.currentPassword ? 'currentPassword-error' : undefined}
          className={inputClass}
        />
      </Field>

      <Field id="newPassword" label="New password" error={errors.newPassword?.message}>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register('newPassword')}
          aria-invalid={Boolean(errors.newPassword)}
          aria-describedby={errors.newPassword ? 'newPassword-error' : undefined}
          className={inputClass}
        />
      </Field>

      <Field id="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register('confirmPassword')}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
          className={inputClass}
        />
      </Field>

      <Feedback error={formError} success={saved} />

      <div className="text-left">
        <button type="submit" disabled={isSubmitting} className={buttonClass}>
          {isSubmitting ? 'Changing…' : 'Change password'}
        </button>
      </div>
    </form>
  )
}

function PhotoSection({ user }: { user: User }) {
  const { updateUser } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const run = async (task: () => Promise<User>, success: string) => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      updateUser(await task())
      setDone(success)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) {
      void run(async () => uploadAvatar(await resizeToSquare(file)), 'Photo saved.')
    }
  }

  return (
    <section aria-labelledby="photo-heading" className="space-y-4">
      <h2 id="photo-heading" className="text-left">
        Profile photo
      </h2>

      <div className="flex items-center gap-4 text-left">
        <Avatar user={user} className="size-24 shrink-0 text-4xl" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className={buttonClass}
            >
              {busy ? 'Saving…' : user.avatarUrl ? 'Change photo' : 'Upload photo'}
            </button>
            {user.avatarUrl && (
              <button
                type="button"
                onClick={() => void run(removeAvatar, 'Photo removed.')}
                disabled={busy}
                className="rounded-md border border-border px-4 py-2 font-heading text-text-h disabled:opacity-50"
              >
                Remove photo
              </button>
            )}
          </div>
          <p className="text-sm text-text">
            JPEG, PNG or WebP. Cropped to a square and saved right away.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      <Feedback error={error} success={done} />
    </section>
  )
}

export default function EditProfile() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <section className="space-y-10">
      <div className="space-y-2 text-left">
        <Link to="/profile" className="text-accent underline underline-offset-4">
          Back to profile
        </Link>
        <h1 className="text-4xl font-heading text-text-h">Edit profile</h1>
      </div>

      <PhotoSection user={user} />
      <DetailsForm user={user} />
      <PasswordForm />
    </section>
  )
}