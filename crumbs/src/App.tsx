import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import RedirectIfAuthed from './components/RedirectIfAuthed'
import AddCollection from './pages/AddCollection'
import CollectionDetail from './pages/CollectionDetail'
import Collections from './pages/Collections'
import Crumbs from './pages/Crumbs'
import EditProfile from './pages/EditProfile'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import NotFound from './pages/NotFound'
import OwnProfile from './pages/OwnProfile'
import PublicProfile from './pages/PublicProfile'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Search from './pages/Search'
import VerifyEmail from './pages/VerifyEmail'

export default function App() {
  const { pathname } = useLocation()
  // The crumb canvas is a full-bleed surface with its own gesture handling, so
  // it opts out of the centred column and the page gutters.
  const fullWidth = pathname === '/crumbs'
  // Signing in is not something you do inside the app, so the two pages that do
  // it get no navigation at all. What replaces the rail is the mark above the
  // form — one way out, back to the landing page — which is why these two are
  // not just the same page without the sidebar.
  const signedOut = pathname === '/login' || pathname === '/register'
  // The landing page is for people who are not in yet, so it carries none of the
  // app's furniture — no rail, no column, no gutters. The two auth pages go the
  // same way, because a split screen sets its own height and its own halves.
  const bare = pathname === '/' || signedOut

  return (
    // A row, not a column: the rail is the first flex child and takes its own
    // width, and the page column takes what is left.
    <div className="flex min-h-svh w-full">
      {!bare && <Sidebar />}

      {/* pt keeps the first heading clear of the floating tab bar; pb clears that
          bar, which floats over the viewport rather than taking part in the flow.
          min-w-0 stops a wide child — the crumb canvas — from pushing the
          column wider than its share instead of letting it shrink.
          flex-col is only on the canvas page, where the column has to be a
          definite height for the canvas to fill what is left of it. That page
          carries no padding of its own: the canvas is the page, so a gutter
          above and below it would only frame nothing.

          Landing and the two auth pages lay themselves out and manage their own
          height, gutters and centring, so the shell keeps its hands off them. */}
      <main
        className={
          bare
            ? 'min-w-0 flex-1'
            : fullWidth
              ? 'flex min-w-0 flex-1 flex-col'
              : 'mx-auto min-w-0 w-full max-w-[1100px] flex-1 px-6 pt-6 pb-28 lg:pb-16'
        }
      >
        <Routes>
        {/* Open to everyone, signed in or not. The landing page has to work as a
            page rather than as a pitch you can only ever see once: its masthead
            offers a signed-in visitor the one link they actually want. */}
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <RedirectIfAuthed>
              <Login />
            </RedirectIfAuthed>
          }
        />
        <Route
          path="/register"
          element={
            <RedirectIfAuthed>
              <Register />
            </RedirectIfAuthed>
          }
        />
        {/* These three carry a token from an emailed link, so they must work
            while signed out — hence no RedirectIfAuthed. */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route
          path="/collections"
          element={
            <RequireAuth>
              <Collections />
            </RequireAuth>
          }
        />
        <Route
          path="/collections/new"
          element={
            <RequireAuth>
              <AddCollection />
            </RequireAuth>
          }
        />
        <Route
          path="/collections/:id"
          element={
            <RequireAuth>
              <CollectionDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/search"
          element={
            <RequireAuth>
              <Search />
            </RequireAuth>
          }
        />
        {/* The old path, kept so existing links still land somewhere sensible. */}
        <Route path="/addevent" element={<Navigate to="/collections/new" replace />} />
        <Route
          path="/crumbs"
          element={
            <RequireAuth>
              <Crumbs />
            </RequireAuth>
          }
        />
        {/* One profile page for everyone, at /u/:username. /profile redirects
            there so old links still land on your own. */}
        <Route
          path="/u/:username"
          element={
            <RequireAuth>
              <PublicProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <OwnProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/edit-profile"
          element={
            <RequireAuth>
              <EditProfile />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}