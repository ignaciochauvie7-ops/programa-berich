import { NavLink } from 'react-router-dom'

type Props = {
  slug: string
}

export function FunnelWorkspaceTabs({ slug }: Props) {
  return (
    <div className="admin-tabs" role="tablist" aria-label="Secciones del funnel">
      <NavLink
        to={`/dashboard/funnels/${slug}/flujo`}
        className={({ isActive }) => 'admin-tab' + (isActive ? ' admin-tab--active' : '')}
      >
        Flujo
      </NavLink>
      <NavLink
        to={`/dashboard/funnels/${slug}/editor`}
        className={({ isActive }) => 'admin-tab' + (isActive ? ' admin-tab--active' : '')}
      >
        Editor
      </NavLink>
    </div>
  )
}
