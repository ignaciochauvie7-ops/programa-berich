import { NavLink } from 'react-router-dom'

const links = [
  { to: '/control/funnels', label: 'Funnels' },
  { to: '/control/programas', label: 'Programas' },
  { to: '/control/alumnos', label: 'Alumnos' },
  { to: '/control/ajustes', label: 'Ajustes' },
]

export function Sidebar() {
  return (
    <aside className="admin-sidebar" aria-label="Navegacion principal">
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__dot" aria-hidden />
        <span>Centro de Control</span>
      </div>
      <nav className="admin-sidebar__nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => 'admin-sidebar__link' + (isActive ? ' admin-sidebar__link--active' : '')}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
