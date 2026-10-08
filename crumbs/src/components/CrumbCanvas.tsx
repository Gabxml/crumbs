import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { crumbLabel, crumbSrc } from '../lib/crumbs'
import type { Crumb } from '../lib/schemas'
import Button from './Button'

type Drag = {
  id: number
  x: number
  y: number
  time: number
  vx: number
  vy: number
  moved: number
}

const NO_CRUMBS: Crumb[] = []

// Measured from the design: square tiles in straight columns, every second column
// sitting a quarter tile lower, with a slightly wider gap between rows than columns.
// Only crumbs are drawn; there are no empty placeholder squares.
// How much of the photos must stay on screen, so they can never be dragged out of reach.
const MARGIN = 120
const PAD = 16
const MAX_TILE = 340
const MIN_TILE = 120

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// Two columns on phones, three everywhere else.
function colsFor(width: number) {
  return width > 0 && width < 560 ? 2 : 3
}

// Tiles shrink on narrow screens so every column fits across the width.
// Column gaps are 6% of a tile, so n tiles plus (n - 1) gaps fill the width minus padding.
function tileFor(width: number) {
  if (width <= 0) return MAX_TILE
  const cols = colsFor(width)
  const fit = Math.floor((width - PAD * 2) / (cols + 0.06 * (cols - 1)))
  return clamp(fit, MIN_TILE, MAX_TILE)
}

function metrics(tile: number) {
  const gapX = Math.round(tile * 0.06)
  const gapY = Math.round(tile * 0.09)
  return { stepX: tile + gapX, stepY: tile + gapY, shift: tile * 0.25, gapX, gapY }
}

// Where the nth crumb goes: left to right, row by row.
function place(index: number, tile: number, cols: number) {
  const { stepX, stepY, shift } = metrics(tile)
  const col = index % cols
  const row = Math.floor(index / cols)
  return { left: col * stepX, top: (col % 2 === 1 ? shift : 0) + row * stepY }
}

// The size of the block the crumbs take up.
function blockSize(count: number, tile: number, cols: number) {
  let width = 0
  let height = 0
  for (let i = 0; i < Math.max(1, count); i++) {
    const { left, top } = place(i, tile, cols)
    width = Math.max(width, left + tile)
    height = Math.max(height, top + tile)
  }
  return { width, height }
}

// Camera position that puts the crumbs in the middle of the viewport.
function homeCamera(
  count: number,
  tile: number,
  cols: number,
  view: { w: number; h: number },
) {
  const block = blockSize(count, tile, cols)
  return { x: (view.w - block.width) / 2, y: (view.h - block.height) / 2 }
}

export default function CrumbCanvas({
  crumbs = NO_CRUMBS,
  emptyMessage,
  onSelect,
}: {
  crumbs?: Crumb[]
  emptyMessage?: string
  onSelect?: (crumb: Crumb) => void
}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef(0)
  const layoutKey = useRef('')
  const [camera, setCamera] = useState({ x: 0, y: 0 })
  const [view, setView] = useState({ w: 0, h: 0 })

  const tile = tileFor(view.w)
  const cols = colsFor(view.w)
  const byId = useMemo(() => new Map(crumbs.map((crumb) => [crumb.id, crumb])), [crumbs])
  const block = useMemo(() => blockSize(crumbs.length, tile, cols), [crumbs.length, tile, cols])

  const minX = MARGIN - block.width
  const maxX = view.w - MARGIN
  const minY = MARGIN - block.height
  const maxY = view.h - MARGIN

  // Images load lazily, so tiles far off screen cost almost nothing.
  const tiles = useMemo(
    () =>
      crumbs.map((crumb, index) => {
        const { left, top } = place(index, tile, cols)
        return (
          <li
            key={crumb.id}
            data-crumb-id={crumb.id}
            // rounded-media rather than the clip-path Squircle: a canvas can hold
            // hundreds of tiles, and 20px is at the edge of where a superellipse
            // reads as different from an arc. index.css upgrades this to a true
            // squircle where the browser can draw one.
            className="absolute overflow-hidden rounded-media"
            style={{ left, top, width: tile, height: tile }}
          >
            <button
              type="button"
              aria-label={crumbLabel(crumb) || 'Open crumb'}
              // Pointer taps are handled by the canvas; this covers the keyboard (detail 0).
              onClick={(event) => {
                if (event.detail === 0) onSelect?.(crumb)
              }}
              className="block size-full cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            >
              <img
                src={crumbSrc(crumb.imageUrl)}
                alt=""
                draggable={false}
                loading="lazy"
                decoding="async"
                className="size-full object-cover"
              />
            </button>
          </li>
        )
      }),
    [crumbs, tile, cols, onSelect],
  )

  const panBy = useCallback(
    (dx: number, dy: number) => {
      setCamera((current) => ({
        x: clamp(current.x + dx, minX, maxX),
        y: clamp(current.y + dy, minY, maxY),
      }))
    },
    [minX, maxX, minY, maxY],
  )

  const stopGlide = useCallback(() => cancelAnimationFrame(frame.current), [])

  const glide = useCallback(
    (startX: number, startY: number) => {
      let vx = startX
      let vy = startY
      let last = performance.now()

      const tick = (now: number) => {
        const dt = Math.min(32, now - last)
        last = now
        panBy(vx * dt, vy * dt)
        const decay = Math.pow(0.94, dt / 16)
        vx *= decay
        vy *= decay
        if (Math.hypot(vx, vy) > 0.02) {
          frame.current = requestAnimationFrame(tick)
        }
      }
      frame.current = requestAnimationFrame(tick)
    },
    [panBy],
  )

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const observer = new ResizeObserver(() => {
      const next = { w: viewport.clientWidth, h: viewport.clientHeight }
      setView(next)
      // Start centered, and center again whenever the layout reflows (rotating a phone, resizing).
      const key = `${tileFor(next.w)}:${colsFor(next.w)}`
      if (key !== layoutKey.current) {
        layoutKey.current = key
        setCamera(homeCamera(crumbs.length, tileFor(next.w), colsFor(next.w), next))
      }
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [crumbs.length])

  // The tiles hang off the left edge of the viewport, so on a narrow screen the
  // gap the margin is meant to guarantee is eaten by the page gutter.
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const parent = viewport.parentElement
    if (!parent) return

    const negative = window.innerWidth - viewport.clientWidth
    if (negative > 0) parent.style.marginInline = `${negative / 2}px`
    return () => {
      parent.style.marginInline = ''
    }
  }, [])

  // The canvas is as wide as the browser window, which includes the scrollbar's width.
  // Clipping the page sideways stops that sliver from creating a horizontal scrollbar.
  useEffect(() => {
    const page = document.documentElement
    page.classList.add('overflow-x-clip')
    return () => {
      page.classList.remove('overflow-x-clip')
    }
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    // Native listener: React's onWheel is passive and cannot stop the page from scrolling.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return
      event.preventDefault()
      stopGlide()
      const unit = event.deltaMode === 1 ? 16 : 1
      panBy(-event.deltaX * unit, -event.deltaY * unit)
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [panBy, stopGlide])

  useEffect(() => stopGlide, [stopGlide])

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    stopGlide()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      time: event.timeStamp,
      vx: 0,
      vy: 0,
      moved: 0,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return

    const dx = event.clientX - current.x
    const dy = event.clientY - current.y
    const dt = Math.max(1, event.timeStamp - current.time)
    panBy(dx, dy)

    current.moved += Math.abs(dx) + Math.abs(dy)
    current.vx = 0.7 * current.vx + 0.3 * (dx / dt)
    current.vy = 0.7 * current.vy + 0.3 * (dy / dt)
    current.x = event.clientX
    current.y = event.clientY
    current.time = event.timeStamp
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.id !== event.pointerId) return
    drag.current = null

    // A press that barely moved is a tap: open the crumb under the finger.
    if (event.type === 'pointerup' && current.moved < 6) {
      const id = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-crumb-id]')?.dataset.crumbId
      const crumb = id ? byId.get(id) : undefined
      if (crumb) {
        onSelect?.(crumb)
        return
      }
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stillMoving = event.timeStamp - current.time < 80
    if (!reduceMotion && stillMoving && Math.hypot(current.vx, current.vy) > 0.05) {
      glide(current.vx, current.vy)
    }
  }

  const recenter = () => {
    stopGlide()
    setCamera(homeCamera(crumbs.length, tile, cols, view))
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Home') {
      event.preventDefault()
      recenter()
      return
    }

    const distance = event.shiftKey ? 300 : 100
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [distance, 0],
      ArrowRight: [-distance, 0],
      ArrowUp: [0, distance],
      ArrowDown: [0, -distance],
    }
    const move = moves[event.key]
    if (!move) return

    event.preventDefault()
    stopGlide()
    panBy(move[0], move[1])
  }

  return (
    <div className="space-y-3">
      <div className="relative left-1/2 w-screen -translate-x-1/2">
        <div
          ref={viewportRef}
          role="region"
          aria-label="Crumbs canvas"
          aria-describedby="crumb-canvas-hint"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="relative h-[75dvh] min-h-80 w-full cursor-grab touch-none overflow-hidden select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent active:cursor-grabbing"
        >
          <ul
            className="absolute top-0 left-0 will-change-transform"
            style={{ transform: `translate3d(${camera.x}px, ${camera.y}px, 0)` }}
          >
            {tiles}
          </ul>

          {crumbs.length === 0 && emptyMessage && (
            <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-[15px] text-text">
              {emptyMessage}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id="crumb-canvas-hint" className="text-left text-[14px] text-text">
          Drag to move around.
          <span className="hidden [@media(hover:hover)]:inline">
            {' '}
            Arrow keys work too, and Home goes back to the start.
          </span>
        </p>
        {crumbs.length > 0 && (
          <Button variant="secondary" size="sm" onClick={recenter} className="shrink-0">
            Recenter
          </Button>
        )}
      </div>
    </div>
  )
}