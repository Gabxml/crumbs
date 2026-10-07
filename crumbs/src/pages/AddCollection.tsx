import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api'
import { createCollection } from '../lib/collections'

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'
const labelClass = 'block font-heading text-text-h'

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
    <section className="space-y-6">
      <h1 className="my-0!">New collection</h1>

      <form onSubmit={submit} className="space-y-5 text-left" noValidate>
        <div className="space-y-1">
          <label htmlFor="title" className={labelClass}>
            Title
          </label>
          <input
            id="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={TITLE_MAX}
            placeholder="Weekend hike"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? 'title-error' : 'title-hint'}
            className={inputClass}
          />
          {fieldErrors.title ? (
            <p id="title-error" role="alert" className="text-sm text-accent">
              {fieldErrors.title[0]}
            </p>
          ) : (
            <p id="title-hint" className="text-xs text-text">
              Optional. You can leave it empty and name it later.
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={DESCRIPTION_MAX}
            rows={4}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? 'description-error' : undefined}
            className={`${inputClass} resize-y`}
          />
          <p className="text-xs text-text">
            {description.length}/{DESCRIPTION_MAX}
          </p>
          {fieldErrors.description && (
            <p id="description-error" role="alert" className="text-sm text-accent">
              {fieldErrors.description[0]}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label htmlFor="tag" className={labelClass}>
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
              className={inputClass}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={!tagText.trim() || tags.length >= TAGS_MAX}
              className="shrink-0 rounded-md border border-border px-3 py-2 font-heading text-text-h disabled:opacity-50"
            >
              Add
            </button>
          </div>

          {tags.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                    className="rounded-full bg-accent-bg px-2 py-0.5 text-xs text-text-h"
                  >
                    {tag} ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-text">
            {tags.length}/{TAGS_MAX}. Tags are lowercase and help Search.
          </p>
          {fieldErrors.tags && (
            <p role="alert" className="text-sm text-accent">
              {fieldErrors.tags[0]}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-accent">
            {formError}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create collection'}
          </button>
          <Link
            to="/collections"
            className="rounded-md border border-border px-4 py-2 font-heading text-text-h"
          >
            Cancel
          </Link>
        </div>

        <p className="text-xs text-text">
          A new collection starts with one empty row. You can add notes, dates, pictures and
          links to it next.
        </p>
      </form>
    </section>
  )
}
