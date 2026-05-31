import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { NeonDots } from '../components/NeonDots'
import { Sidebar } from './Sidebar'
import { AffiliadosPage } from './pages/AffiliadosPage'
import { AlumnosPage } from './pages/AlumnosPage'
import { FunnelsPage } from './pages/FunnelsPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { ProgramasPage } from './pages/ProgramasPage'
import './dashboard.css'

function DashboardLayout() {
  return (
    <div className="admin-app">
      <NeonDots />
      <div className="admin-app__content">
        <Sidebar />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export function DashboardRoutes() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path="/" element={<Navigate to="/control/funnels" replace />} />
        <Route path="/funnels" element={<FunnelsPage />} />
        <Route path="/programas" element={<ProgramasPage />} />
        <Route path="/alumnos" element={<AlumnosPage />} />
        <Route path="/alumnosr" element={<Navigate to="/control/alumnos" replace />} />
        <Route path="/afiliados" element={<AffiliadosPage />} />
        <Route
          path="/pagos"
          element={<PlaceholderPage title="Pagos" description="Proximamente: historial de cobros, estados y conciliacion." />}
        />
        <Route
          path="/ajustes"
          element={<PlaceholderPage title="Ajustes" description="Proximamente: configuraciones generales de la plataforma." />}
        />
      </Route>
    </Routes>
  )
}
