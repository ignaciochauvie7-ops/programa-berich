import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardRoutes } from './dashboard/AppShell'
import { FunnelRoute } from './FunnelRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard/*" element={<DashboardRoutes />} />
      <Route path="/f/:slug" element={<FunnelRoute />} />
    </Routes>
  )
}
