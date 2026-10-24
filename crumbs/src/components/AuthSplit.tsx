import type { ReactNode } from 'react'

type Mode = 'login' | 'register'

// What the banner says. One record for both pages so the two halves cannot drift
// apart, and so each page's banner is written for where its form is not.
//
// No call to action: the other page is already one tap away under the form, and a
// second link to it across the split is a button asking for a decision the page
// has already made by being on this side.
const BANNER: Record<Mode, { headline: string; body: string }> = {
  register: {
    headline: 'Everything you meant to do, in one place',
    body: 'Collections for the plans, crumbs for the photos, and the people you made them with. Share a list with somebody without either of you keeping a copy.',
  },
  login: {
    headline: 'Pick up where you left off',
    body: 'Your collections, your crumbs, and everyone you shared them with are all still here — nothing was archived while you were away.',
  },
}

/**
 * A sign-in page in two halves: the form on a grey panel, the pitch on a white
 * one. On /register the form is on the left; on /login the pair is mirrored
 * across the vertical axis, so the banner moves to the left and the form to the
 * right. That flip is deliberate — the two pages are the same two objects
 * described from opposite sides, and putting the same panel in the same place on
 * both would make them look like one page twice.
 *
 * Narrow screens cannot be split, so they stack instead, and there the form is
 * always first: nobody should have to scroll past an advertisement to type their
 * email. Only the desktop order flips.
 */
export default function AuthSplit({
  mode,
  children,
}: {
  mode: Mode
  /** The form itself, already laid out. */
  children: ReactNode
}) {
  const formFirst = mode === 'register'
  const banner = BANNER[mode]

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div
        className={`order-1 flex items-center justify-center bg-code-bg px-6 py-14 ${
          formFirst ? 'lg:order-1' : 'lg:order-2'
        }`}
      >
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* The banner is artwork: a blurred mesh gradient, the same picture
          whatever the theme is doing. So the words on it are fixed colours too —
          `--on-accent`, the navy the app already puts on its accent fills. That
          reads about 7:1 against the light blue the swatches cover, and 4.7:1
          against the mid one. Tinting the type with the theme would give
          near-white on a light background in dark mode, and a headline nobody
          can read is worse than a panel that ignores the mode.

          bg-cover crops the 2:1 mesh down to a tall panel, which costs nothing
          here: a blurred gradient has no feature to lose by cropping, and it is
          what stops the swatches letterboxing at every window size.

          items-center, not items-end: with the call to action gone the copy is
          only two lines of text, and hanging them off the bottom of a tall panel
          left them stranded under a screenful of gradient. Centred, they read as
          the caption for the whole picture. */}
      <div
        className={`order-2 flex items-center bg-[url('/auth-mesh-gradient.svg')] bg-cover bg-center px-6 py-14 lg:px-14 ${
          formFirst ? 'lg:order-2' : 'lg:order-1'
        }`}
      >
        <div className="w-full max-w-md space-y-5">
          <h2 className="text-[30px] font-semibold tracking-heading text-accent">
            {banner.headline}
          </h2>
          <p className="text-[16px] leading-relaxed text-accent/80">{banner.body}</p>
        </div>
      </div>
    </div>
  )
}