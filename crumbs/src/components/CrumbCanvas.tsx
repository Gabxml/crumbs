import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import { crumbLabel, crumbSrc } from '../lib/crumbs'
import type { Crumb } from '../lib/schemas'
import { RADIUS } from '../lib/ui'
import { squircleClip } from '../lib/squircle'
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

// Measured from the design: square tiles on a grid, each carrying the crumb shadow
// so a photograph has an edge of its own against the canvas. Only crumbs are drawn;
// there are no empty placeholder squares.
//
// The layout is radial rather than a filled grid. Every crumb wants the middle of
// the canvas, and since only one can have it, each takes the free slot nearest the
// middle. A slot's ring is its Chebyshev distance from the middle, so the grid grows
// as concentric squares; within a ring the straight-out edges are claimed before the
// corners, and the sweep runs clockwise from due north. The first crumb sits exactly
// at the centre, which is why tile coordinates are relative to it and may be negative.
//
// How much of the photos must stay on screen, so they can never be dragged out of reach.
const MARGIN = 120
const PAD = 16
const MAX_TILE = 340
const MIN_TILE = 120

// Empty space kept around the photos, on every side, measured in tiles.
//
// Without this the pannable area stops exactly at the edge of the block of photos,
// so panning to a limit shows you that boundary and the field reads as a finite
// grid floating in a void. Two to three tiles of slack in each direction means the
// photos run off every edge of the screen with room to spare before anything stops,
// which is what makes the canvas feel boundless rather than boxed.
const PAD_TILES = 2.5

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

// How many tiles should span the viewport: two on phones, three everywhere else.
// Only the tile SIZE depends on this now. How many columns the canvas ends up with
// is whatever the radial layout reaches, which is not capped.
function acrossFor(width: number) {
  return width > 0 && width < 560 ? 2 : 3
}

// Tiles shrink on narrow screens so the centre of the grid still fits across the
// width. Column gaps are 6% of a tile, so n tiles plus (n - 1) gaps fill the width
// minus padding.
function tileFor(width: number) {
  if (width <= 0) return MAX_TILE
  const across = acrossFor(width)
  const fit = Math.floor((width - PAD * 2) / (across + 0.06 * (across - 1)))
  return clamp(fit, MIN_TILE, MAX_TILE)
}

function metrics(tile: number) {
  const gapX = Math.round(tile * 0.06)
  const gapY = Math.round(tile * 0.09)
  return { stepX: tile + gapX, stepY: tile + gapY, gapX, gapY }
}

function manhattan(cell: [number, number]) {
  return Math.abs(cell[0]) + Math.abs(cell[1])
}

// Compass angle of a slot, clockwise from due north. atan2(x, -y) is the trick:
// it puts north at 0 and measures clockwise in screen coordinates, where y grows
// downwards.
function bearing(cell: [number, number]) {
  return (Math.atan2(cell[0], -cell[1]) + Math.PI * 2) % (Math.PI * 2)
}

// The slots of one concentric square, in the order crumbs claim them: the
// straight-out edges first (smaller Manhattan distance), then clockwise from north.
function ringCells(radius: number): [number, number][] {
  const cells: [number, number][] = []

  for (let x = -radius; x <= radius; x += 1) cells.push([x, -radius])
  for (let y = -radius + 1; y <= radius; y += 1) cells.push([radius, y])
  for (let x = radius - 1; x >= -radius; x -= 1) cells.push([x, radius])
  for (let y = radius - 1; y >= -radius + 1; y -= 1) cells.push([-radius, y])

  return cells.sort((a, b) => manhattan(a) - manhattan(b) || bearing(a) - bearing(b))
}

// Every slot, in the order the crumbs claim them. The sequence never changes — no
// crumb is involved — so it is built once and kept: asking for more extends the
// cache, asking for fewer is free.
const claimed: [number, number][] = [[0, 0]]
let claimedRing = 0

function slots(count: number): [number, number][] {
  while (claimed.length < count) {
    claimedRing += 1
    claimed.push(...ringCells(claimedRing))
  }
  return claimed
}

// Where the nth crumb goes. The origin is the centre of the canvas, so both
// coordinates may be negative.
function place(index: number, tile: number) {
  const { stepX, stepY } = metrics(tile)
  const [col, row] = slots(index + 1)[index]
  return { left: col * stepX, top: row * stepY }
}

// The area the first `count` crumbs cover, as edges relative to the centre.
// An empty canvas reports a single tile, so it still recentres somewhere sensible.
function blockSize(count: number, tile: number) {
  const box = { left: 0, top: 0, right: tile, bottom: tile }
  if (count <= 0) return box

  const { stepX, stepY } = metrics(tile)
  const taken = slots(count)

  for (let i = 0; i < count; i += 1) {
    const [col, row] = taken[i]
    const left = col * stepX
    const top = row * stepY
    box.left = Math.min(box.left, left)
    box.top = Math.min(box.top, top)
    box.right = Math.max(box.right, left + tile)
    box.bottom = Math.max(box.bottom, top + tile)
  }

  return box
}

// Camera position that puts the crumbs in the middle of the viewport.
function homeCamera(
  count: number,
  tile: number,
  view: { w: number; h: number },
) {
  const box = blockSize(count, tile)
  return {
    x: (view.w - (box.right - box.left)) / 2 - box.left,
    y: (view.h - (box.bottom - box.top)) / 2 - box.top,
  }
}

// How far the camera may travel on one axis while keeping the photos on screen.
//
// The photos get PAD_TILES of empty space beyond their outermost edge on every
// side, so panning all the way out leaves that much blank canvas visible rather
// than the edge of the block. The slack is capped by the viewport, though: past
// about half the axis there would not be room left to keep MARGIN of photo
// visible, and a canvas you can pan a photo clean off the screen is worse than one
// with a visible edge.
//
// Two regimes inside that. When the padded block is still narrower than the
// viewport, there is nothing to pan to and it holds still, centred on the photos.
// When it is wider, the ends no longer cross and the camera may travel from "the
// photos' far edge at the margin" to "their near edge at the margin", so the outer
// rings stay reachable.
function axisRange(
  edge: { left: number; right: number },
  view: number,
  tile: number,
): [number, number] {
  const slack = Math.min(tile * PAD_TILES, Math.max(0, view - MARGIN * 2))
  const left = edge.left - slack
  const right = edge.right + slack
  const width = right - left

  const leftEnd = view - MARGIN - right // camera when fully panned left
  const rightEnd = MARGIN - left // camera when fully panned right

  if (width <= view - MARGIN * 2) {
    const centred = (view - (edge.right - edge.left)) / 2 - edge.left
    return [centred, centred]
  }
  return [leftEnd, rightEnd]
}

export default function CrumbCanvas({
   crumbs = NO_CRUMBS,
   emptyMessage,
   onSelect,
   scope = 'all',
   onScopeChange,
 }: {
   crumbs?: Crumb[]
   emptyMessage?: string
   onSelect?: (crumb: Crumb) => void
   scope?: 'mine' | 'all'
   onScopeChange?: (scope: 'mine' | 'all') => void
 }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const drag = useRef<Drag | null>(null)
  const frame = useRef(0)
  const layoutKey = useRef('')
  const [camera, setCamera] = useState({ x: 0, y: 0 })
  const [view, setView] = useState({ w: 0, h: 0 })

  const tile = tileFor(view.w)
  const byId = useMemo(() => new Map(crumbs.map((crumb) => [crumb.id, crumb])), [crumbs])
  const block = useMemo(() => blockSize(crumbs.length, tile), [crumbs.length, tile])

  const [minX, maxX] = axisRange({ left: block.left, right: block.right }, view.w, tile)
  const [minY, maxY] = axisRange({ left: block.top, right: block.bottom }, view.h, tile)

  // The one superellipse the whole canvas shares. Recomputed only when the tile
  // size changes, which is at most a handful of times across a resize.
  const tileClip = useMemo(() => squircleClip(tile, RADIUS.tile), [tile])

  // Images load lazily, so tiles far off screen cost almost nothing.
  const tiles = useMemo(
    () =>
      crumbs.map((crumb, index) => {
        const { left, top } = place(index, tile)
        return (
          <li
            key={crumb.id}
            data-crumb-id={crumb.id}
            // Not the Squircle component, though the rest of the app uses it: a
            // canvas can hold hundreds of tiles, and each Squircle brings its own
            // resize listener and path generation. Every tile is the same size, so
            // the path is built once and inherited through --tile-clip instead —
            // see index.css, which applies it only where corner-shape cannot draw
            // the curve natively.
            //
            // The shadow is on this <li> and the corner clipping is on the div
            // inside it, because clip-path takes an element's own box-shadow with
            // it. Same reason PublicProfile puts its shadow on the button.
            //
            // A photograph on a flat canvas has no edge of its own, so every tile carries
            // the crumb shadow: a white photo on light grey and a black one on
            // near-black would otherwise have nothing to read against.
            className="absolute rounded-tile shadow-crumb"
            style={{ left, top, width: tile, height: tile }}
          >
            {/* Clipping the photo to the corner is this div's whole job, and index.css
                decides how: a radius and an overflow where the browser can draw the
                curve natively, the shared clip-path where it cannot. Keeping both at
                once would clip to the intersection, which is the arc — so the squircle
                would quietly never appear. */}
            <div className="canvas-tile-body size-full">
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
            </div>
          </li>
        )
      }),
    [crumbs, tile, onSelect],
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
      const key = `${tileFor(next.w)}:${acrossFor(next.w)}`
      if (key !== layoutKey.current) {
        layoutKey.current = key
        setCamera(homeCamera(crumbs.length, tileFor(next.w), next))
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
    setCamera(homeCamera(crumbs.length, tile, view))
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
    // Two elements, not one. The outer is the page column's own width and is
    // what the Recenter button is positioned against; the inner is the one that
    // runs the full width of the window. Anchoring the button to the full-bleed
    // element instead would put it past the right edge of the screen, since that
    // element is centred on the column and therefore overhangs on both sides.
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="relative left-1/2 flex min-h-0 flex-1 w-screen -translate-x-1/2">
        <div
          ref={viewportRef}
          role="region"
          aria-label="Crumbs canvas"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          // The viewport's height is whatever the page column has left once the
          // heading is above it, rather than a fixed slice of the screen: a canvas
          // that stops short leaves a band of empty canvas below the photos, and
          // there is nothing to put there.
          className="relative h-full min-h-80 w-full cursor-grab touch-none overflow-hidden select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent active:cursor-grabbing"
        >
          <ul
            className="absolute top-0 left-0 will-change-transform"
            style={
              {
                transform: `translate3d(${camera.x}px, ${camera.y}px, 0)`,
                '--tile-clip': tileClip,
              } as CSSProperties
            }
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

      {/* Floating over the canvas rather than sitting under it, so putting it
          back costs no page height. A sibling of the full-bleed element, so a
          press on it never reaches the pan handlers.

          bg-surface rather than the usual secondary fill: this button can land
          on any photograph, and a plain fill with no edge vanishes against a
          light one. A solid surface with a hairline and the float shadow keeps
          the same quiet weight but stays readable over anything. */}
      {crumbs.length > 0 && (
        <div className="absolute top-0 right-4 z-10 mt-4 flex shrink-0 gap-2">
          {onScopeChange && (
            <div className="flex rounded-3xl border border-border bg-surface shadow-float">
              <Button
                variant={scope === 'all' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onScopeChange('all')}
                className="rounded-r-none"
              >
                Friends
              </Button>
              <Button
                variant={scope === 'mine' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => onScopeChange('mine')}
                className="rounded-l-none"
              >
                Mine
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={recenter}
            className="bg-surface shadow-float"
          >
            Recenter
          </Button>
        </div>
      )}
    </div>
  )
}
