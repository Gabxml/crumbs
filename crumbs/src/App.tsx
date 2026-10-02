import { Route, Routes } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import RedirectIfAuthed from './components/RedirectIfAuthed'
import AddEvent from './pages/AddEvent'
import Collections from './pages/Collections'
import Crumbs from './pages/Crumbs'
import EditProfile from './pages/EditProfile'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Login from './pages/Login'
import NotFound from './pages/NotFound'
import Profile from './pages/Profile'
import Register from './pages/Register'
import Search from './pages/Search'

export default function App() {
  return (
    <main className="mx-auto min-h-svh w-full max-w-3xl px-6 py-12">
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
        <Route
          path="/forgot-password"
          element={
            <RedirectIfAuthed>
              <ForgotPassword />
            </RedirectIfAuthed>
          }
        />
        <Route path="/collections" element={<Collections />} />
        <Route path="/search" element={<Search />} />
        <Route path="/addevent" element={<AddEvent />} />
        <Route path="/crumbs" element={<Crumbs />} />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
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
