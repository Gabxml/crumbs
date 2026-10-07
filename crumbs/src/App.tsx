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
import NotFound from './pages/NotFound'
import OwnProfile from './pages/OwnProfile'
import PublicProfile from './pages/PublicProfile'
import Register from './pages/Register'
import ResetPassword from './pages/ResetPassword'
import Search from './pages/Search'
import VerifyEmail from './pages/VerifyEmail'

export default function App() {
  const { pathname } = useLocation()
  const fullWidth = pathname === '/crumbs'

  return (
    <main
      className={
        fullWidth
          ? 'min-h-svh w-full py-12'
          : 'mx-auto min-h-svh w-full max-w-3xl px-6 py-12'
      }
    >
      <Routes>
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
  )
}