import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
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
import Button from '../components/Button'
import Card from '../components/Card'
import Field from '../components/Field'

function Feedback({ error, success }: { error: string | null; success: string | null }) {
  return (
    <div aria-live="polite" className="text-left">
      {error && (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="text-[15px] font-medium text-success">
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
      <h2 id="details-heading" className="text-[17px] font-semibold tracking-heading text-text-h">
        Your details
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="First name"
          type="text"
          autoComplete="given-name"
          {...register('firstName')}
          error={errors.firstName?.message}
        />

        <Field
          label="Last name"
          type="text"
          autoComplete="family-name"
          {...register('lastName')}
          error={errors.lastName?.message}
        />
      </div>

      <Field
        label="Username"
        type="text"
        autoComplete="username"
        {...register('username')}
        error={errors.username?.message}
      />

      <Field
        label="Email"
        type="email"
        autoComplete="email"
        {...register('email')}
        error={errors.email?.message}
      />

      <Feedback error={formError} success={saved} />

      <div>
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
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
      <h2 id="password-heading" className="text-[17px] font-semibold tracking-heading text-text-h">
        Change password
      </h2>

      <Field
        label="Current password"
        type="password"
        autoComplete="current-password"
        {...register('currentPassword')}
        error={errors.currentPassword?.message}
      />

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

      <Feedback error={formError} success={saved} />

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Changing…' : 'Change password'}
        </Button>
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
      <h2 id="photo-heading" className="text-[17px] font-semibold tracking-heading text-text-h">
        Profile photo
      </h2>

      <div className="flex items-center gap-4">
        <div className="size-24 shrink-0 text-4xl">
          <Avatar user={user} />
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => inputRef.current?.click()} disabled={busy}>
              {busy ? 'Saving…' : user.avatarUrl ? 'Change photo' : 'Upload photo'}
            </Button>
            {user.avatarUrl && (
              <Button
                variant="secondary"
                onClick={() => void run(removeAvatar, 'Photo removed.')}
                disabled={busy}
              >
                Remove photo
              </Button>
            )}
          </div>
          <p className="text-[14px] text-text">
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
    <section className="mx-auto max-w-xl space-y-6">
      <div className="space-y-2">
        <Link
          to="/profile"
          className="inline-block rounded text-[14px] text-accent underline underline-offset-4"
        >
          Back to profile
        </Link>
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
          Edit profile
        </h1>
      </div>

      <Card>
        <PhotoSection user={user} />
      </Card>
      <Card>
        <DetailsForm user={user} />
      </Card>
      <Card>
        <PasswordForm />
      </Card>
    </section>
  )
}