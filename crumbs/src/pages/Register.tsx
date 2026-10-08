import { useState } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ApiError } from '../lib/api'
import { useAuth } from '../hooks/useAuth'
import ResendVerification from '../components/ResendVerification'
import Button from '../components/Button'
import Card from '../components/Card'
import Field from '../components/Field'
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

  if (created) {
    return (
      <section className="mx-auto max-w-md space-y-6">
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
          Check your email
        </h1>

        <Card className="space-y-4">
          <p className="text-[15px] text-text">
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
          <p className="text-[15px] text-text">
            The link works once and expires in 24 hours. Until you use it you cannot sign in.
          </p>

          <ResendVerification email={created.email} />
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
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">Sign up</h1>

      <Card className="space-y-5">
        {formError && (
          <p role="alert" className="text-[15px] text-danger">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
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

          <Field
            label="Password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            error={errors.password?.message}
          />

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </Card>

      <p className="text-[15px] text-text">
        <Link to="/login" className="rounded text-accent underline underline-offset-4">
          Already have an account?
        </Link>
      </p>
    </section>
  )
}
