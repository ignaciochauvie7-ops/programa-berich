import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardRoutes } from './dashboard/AppShell'
import { FunnelRoute } from './FunnelRoute'
import { StudentInviteSignupPage } from './student/StudentInviteSignupPage'
import { StudentLoginPage } from './student/StudentLoginPage'
import { StudentProgramRoute } from './student/StudentProgramRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/control" replace />} />
      <Route path="/control/*" element={<DashboardRoutes />} />
      <Route path="/dashboard/*" element={<Navigate to="/control" replace />} />
      <Route path="/f/:slug" element={<FunnelRoute />} />
      <Route path="/ingresar" element={<StudentLoginPage />} />
      <Route path="/crear-cuenta" element={<StudentInviteSignupPage />} />
      <Route path="/programa/:slug" element={<StudentProgramRoute />} />
    </Routes>
  )
}
