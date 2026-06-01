import { Link } from 'react-router-dom'
import '../student/student.css'

export function NotFoundPage() {
  return (
    <div className="student-auth">
      <div className="student-auth__card">
        <h1>Página no encontrada</h1>
        <p>Esta dirección no existe. Probá una de estas opciones:</p>
        <div className="student-auth__actions">
          <Link className="student-auth__button" to="/quiz" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Ir al quiz
          </Link>
          <Link className="student-auth__button" to="/login" style={{ textAlign: 'center', textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
