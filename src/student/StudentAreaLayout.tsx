import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'

type Props = {
  children: ReactNode
}

export function StudentAreaLayout({ children }: Props) {
  const { signOut } = useAuth()
  const programPath = `/programa/${BERICH_PROGRAM_SLUG}`

  return (
    <div className="student-program student-program--with-sidebar">
      <aside className="student-sidebar">
        <p className="student-sidebar__brand">
          <strong>Programa Berich</strong>
        </p>
        <nav className="student-sidebar__nav" aria-label="Área de alumno">
          <NavLink
            to={programPath}
            className={({ isActive }) =>
              'student-sidebar__link' + (isActive ? ' student-sidebar__link--active' : '')
            }
            end
          >
            Programa
          </NavLink>
          <NavLink
            to="/programa/mi-perfil"
            className={({ isActive }) =>
              'student-sidebar__link' + (isActive ? ' student-sidebar__link--active' : '')
            }
          >
            Mi perfil
          </NavLink>
        </nav>
        <button type="button" className="student-sidebar__logout admin-btn admin-btn--ghost" onClick={() => signOut()}>
          Salir
        </button>
      </aside>
      <div className="student-program__content">
        <main className="student-program__main student-program__body">{children}</main>
      </div>
    </div>
  )
}
