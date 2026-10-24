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
  const [scope, setScope] = useState<'mine' | 'all'>('all')

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
    fetchCrumbs(scope)
      .then((list) => {
        if (cancelled) return
        setCrumbs(list)
        setLoadError(null)
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
  }, [scope])

  // Changing the scope is the user asking again, so the previous answer — error
  // included — stops being shown before the next one arrives. Done here rather
  // than in the effect, which would be a render triggered by an effect.
  const changeScope = (next: 'mine' | 'all') => {
    setScope(next)
    setLoadError(null)
  }

  return (
    <section className="relative flex min-h-0 flex-1 flex-col gap-4">
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
        scope={scope}
        onScopeChange={changeScope}
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