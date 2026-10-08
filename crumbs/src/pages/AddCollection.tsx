import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { createCollection } from '../lib/collections'
import Button, { ButtonLink } from '../components/Button'
import Card from '../components/Card'
import Field from '../components/Field'

const TITLE_MAX = 80
const DESCRIPTION_MAX = 500
const TAGS_MAX = 8
const TAG_MAX = 24

export default function AddCollection() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagText, setTagText] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const addTag = () => {
    const tag = tagText.trim().toLowerCase()
    if (!tag) return
    if (tags.includes(tag)) {
      setTagText('')
      return
    }
    if (tags.length >= TAGS_MAX) return
    setTags((current) => [...current, tag])
    setTagText('')
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setFormError(null)
    setFieldErrors({})

    try {
      // The title may be left blank: a collection opens empty and is titled
      // later. This page exists to set it up, so an empty submit is allowed.
      const created = await createCollection({ title, description, tags })
      navigate(`/collections/${created.id}`, { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message)
        setFieldErrors(error.fields)
      } else {
        setFormError('Could not create the collection. Try again.')
      }
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto max-w-xl space-y-6">
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
        New collection
      </h1>

      <Card>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={TITLE_MAX}
          placeholder="Weekend hike"
          error={fieldErrors.title?.[0]}
          hint="Optional. You can leave it empty and name it later."
        />

        <Field
          label="Description"
          as="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          maxLength={DESCRIPTION_MAX}
          rows={4}
          error={fieldErrors.description?.[0]}
          hint={`${description.length}/${DESCRIPTION_MAX}`}
        />

        <div className="space-y-1.5">
          <label htmlFor="tag" className="text-[13px] font-medium text-text-h">
            Tags
          </label>
          <div className="flex gap-2">
            <input
              id="tag"
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                addTag()
              }}
              maxLength={TAG_MAX}
              placeholder="outdoors, then press Enter"
              className="w-full rounded-control bg-fill px-4 py-2.5 text-[15px] text-text-h placeholder:text-inactive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <Button
              variant="secondary"
              onClick={addTag}
              disabled={!tagText.trim() || tags.length >= TAGS_MAX}
            >
              Add
            </Button>
          </div>

          {tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li key={tag}>
                  {/* A tag is removable, so it is a control and carries the focus
                      ring; ChipLabel is for tags that are only read. */}
                  <button
                    type="button"
                    onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                    className="inline-flex items-center gap-1.5 rounded-full bg-accent-tint px-3 py-1 text-[13px] font-medium text-on-accent transition duration-200 ease-ios focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.97]"
                  >
                    {tag} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[13px] text-text">
            {tags.length}/{TAGS_MAX}. Tags are lowercase and help Search.
          </p>
          {fieldErrors.tags && (
            <p role="alert" className="text-[13px] text-danger">
              {fieldErrors.tags[0]}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-[15px] text-danger">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Create collection'}
          </Button>
          <ButtonLink to="/collections" variant="secondary">
            Cancel
          </ButtonLink>
        </div>

        <p className="text-[13px] text-text">
          A new collection starts with one empty row. You can add notes, dates, pictures and
          links to it next.
        </p>
      </form>
      </Card>
    </section>
  )
}
