import { Link } from 'react-router-dom'
import Card from '../components/Card'

export default function NotFound() {
  return (
    <section className="mx-auto max-w-md space-y-6">
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">404</h1>

      <Card className="space-y-3">
        <p className="text-[15px] text-text">That page does not exist.</p>
        <Link to="/" className="rounded text-accent underline underline-offset-4">
          Back home
        </Link>
      </Card>
    </section>
  )
}
