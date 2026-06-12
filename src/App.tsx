import { Navigate, Route, Routes } from 'react-router-dom'
import { HomeRoute } from './auth/HomeRoute'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { DashboardRoutes } from './dashboard/AppShell'
import { FunnelHomePage } from './funnel/FunnelHomePage'
import { QuizPage } from './funnel/QuizPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { AccountActivationPage } from './student/AccountActivationPage'
import { CoachSetupPage } from './student/CoachSetupPage'
import { PurchaseSuccessPage } from './student/PurchaseSuccessPage'
import { StudentInviteSignupPage } from './student/StudentInviteSignupPage'
import { StudentLoginPage } from './student/StudentLoginPage'
import { StudentAreaRoute } from './student/StudentAreaRoute'
import { StudentProgramRoute } from './student/StudentProgramRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/funnel/metodo-berich" element={<FunnelHomePage />} />
      <Route path="/quiz" element={<QuizPage />} />
      <Route element={<ProtectedRoute requireAdmin />}>
        <Route path="/control/*" element={<DashboardRoutes />} />
      </Route>
      <Route path="/control" element={<Navigate to="/control/funnels" replace />} />
      <Route path="/dashboard/*" element={<Navigate to="/control" replace />} />
      <Route path="/compra-exitosa" element={<PurchaseSuccessPage />} />
      <Route path="/login" element={<StudentLoginPage />} />
      <Route path="/activar-cuenta" element={<AccountActivationPage />} />
      <Route path="/configurar-perfil" element={<CoachSetupPage />} />
      <Route path="/ingresar" element={<StudentLoginPage />} />
      <Route path="/crear-cuenta" element={<StudentInviteSignupPage />} />
      <Route path="/programa/mi-perfil" element={<StudentAreaRoute page="profile" />} />
      <Route path="/programa" element={<StudentProgramRoute />} />
      <Route path="/programa/:slug" element={<StudentProgramRoute />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
