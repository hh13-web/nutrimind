import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import AppShell from './components/AppShell'
import Dashboard from './pages/Dashboard'
import Analyze from './pages/Analyze'
import Coach from './pages/Coach'
import Log from './pages/Log'
import Report from './pages/Report'
import Profile from './pages/Profile'
import { Toasts } from './components/ui'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="analyze" element={<Analyze />} />
          <Route path="coach" element={<Coach />} />
          <Route path="log" element={<Log />} />
          <Route path="report" element={<Report />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toasts />
    </>
  )
}
