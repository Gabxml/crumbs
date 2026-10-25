// Resolve the theme before first paint. React mounts later, and a page that
// paints light and then repaints dark reads as a glitch.
//
// This lives in a file rather than an inline <script> so the Content-Security-
// Policy can use a strict `script-src 'self'` with no inline exception.
try {
  var stored = localStorage.getItem('crumbs:theme')
  document.documentElement.dataset.theme =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
} catch {
  document.documentElement.dataset.theme = 'light'
}
