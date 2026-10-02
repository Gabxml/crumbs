import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="space-y-6">
      <h1 className="text-4xl font-heading text-text-h">404</h1>
      <p className="text-text">That page does not exist.</p>
      <Link to="/" className="text-accent underline">
        Back home
      </Link>
    </section>
  )
}
