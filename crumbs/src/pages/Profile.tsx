import { useAuth } from '../hooks/useAuth'

export default function Profile() {
  const { user, logout } = useAuth()

  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-heading text-text-h">Profile</h1>

      <dl className="space-y-2 text-text">
        <div>
          <dt className="inline font-heading text-text-h">Username: </dt>
          <dd className="inline">{user?.username}</dd>
        </div>
        <div>
          <dt className="inline font-heading text-text-h">Email: </dt>
          <dd className="inline">{user?.email}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => void logout()}
        className="rounded-md border border-border px-4 py-2 font-heading text-text-h"
      >
        Sign out
      </button>
    </section>
  )
}
