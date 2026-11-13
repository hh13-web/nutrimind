import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Logout from './pages/Logout'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Coach from './pages/Coach'
import Log from './pages/Log'
import Report from './pages/Report'
import Profile from './pages/Profile'
import LoginPrompt from './components/LoginPrompt'
import Onboarding from './components/Onboarding'
import { useAuth } from './context/AuthContext'
import { AppProvider } from './context/AppContext'
import { Logo } from './components/ui'

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-cream">
      <div className="flex flex-col items-center gap-4">
        <Logo size={38} />
        <p className="text-[11.5px] text-ink-500">正在载入你的营养数据…</p>
      </div>
    </div>
  )
}

function ProtectedApp() {
  const { user, isGuest, initializing } = useAuth()
  const location = useLocation()

  if (initializing) return <Splash />
  if (!user && !isGuest) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return (
    <AppProvider key={user?.id ?? 'guest'}>
      <AppShell />
    </AppProvider>
  )
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/app" element={<ProtectedApp />}>
          <Route index element={<Dashboard />} />
          <Route path="analyze" element={<Analyze />} />
          <Route path="coach" element={<Coach />} />
          <Route path="log" element={<Log />} />
          <Route path="report" element={<Report />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <LoginPrompt />
      <Onboarding />
    </>
  )
}
