import { useEffect, useState } from 'react'
import CrumbCanvas from '../components/CrumbCanvas'
import CrumbUploader from '../components/CrumbUploader'
import CrumbViewer from '../components/CrumbViewer'
import { fetchCrumbs } from '../lib/crumbs'
import { fetchCollectionOptions } from '../lib/collections'
import type { Crumb } from '../lib/schemas'
import type { CollectionOption } from '../lib/collections'

export default function Crumbs() {
  const [crumbs, setCrumbs] = useState<Crumb[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Crumb | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [collections, setCollections] = useState<CollectionOption[]>([])

  // Only fills the "add to a collection" picker, so a failure here must not
  // stop the crumbs themselves from loading.
  useEffect(() => {
    let cancelled = false
    fetchCollectionOptions()
      .then((list) => {
        if (!cancelled) setCollections(list)
      })
      .catch(() => {
        if (!cancelled) setCollections([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchCrumbs()
      .then((list) => {
        if (!cancelled) setCrumbs(list)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : 'Could not load your crumbs.',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="flex flex-col gap-6">
      {/* Hidden rather than stacked: the canvas is the page, and a heading above
          it would only push the photos down the viewport. */}
      <h1 className="sr-only">Crumbs</h1>

      {loadError && (
        <p role="alert" className="text-[15px] text-danger">
          {loadError}
        </p>
      )}

      {/* Remounted once the crumbs arrive, so the view starts centered on them. */}
      <CrumbCanvas
        key={loaded ? 'loaded' : 'loading'}
        crumbs={crumbs}
        emptyMessage={
          loaded && !loadError ? 'No crumbs yet. Tap the + button to add your first.' : undefined
        }
        onSelect={setSelected}
      />

      <CrumbUploader
        collections={collections}
        onUploaded={(crumb) => setCrumbs((current) => [crumb, ...current])}
      />
      <CrumbViewer
        crumb={selected}
        onClose={() => setSelected(null)}
        onDeleted={(id) => setCrumbs((current) => current.filter((c) => c.id !== id))}
      />
    </section>
  )
}