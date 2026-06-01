import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'
import { isAdminUser } from './access'
import '../student/student.css'

export function ProtectedRoute({ requireAdmin = false }: { requireAdmin?: boolean }) {
  const { configured, loading, user } = useAuth()
  const location = useLocation()

  if (!configured) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Acceso privado</h1>
          <p>Supabase no está configurado en esta instalación.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="student-auth">
        <div className="student-auth__card">
          <h1>Cargando…</h1>
          <p>Verificando sesión.</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (requireAdmin && !isAdminUser(user)) {
    return <Navigate to="/programa" replace />
  }

  return <Outlet />
}
