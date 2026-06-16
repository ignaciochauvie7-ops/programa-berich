import { useEffect, useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { BERICH_PROGRAM_SLUG } from '../program/berichProgramData'
import { UpgradePanel } from './UpgradePanel'

type TrialStatus = 'active' | 'expiring' | 'expired' | 'subscribed'

type Props = {
  children: ReactNode
}

export function StudentAreaLayout({ children }: Props) {
  const { signOut, session } = useAuth()
  const programPath = `/programa/${BERICH_PROGRAM_SLUG}`
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null)

  useEffect(() => {
    if (!session?.access_token) return

    void fetch('/api/coach/my-profile', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((body: { coach?: { status?: TrialStatus; days_left?: number | null } }) => {
        const s = body.coach?.status
        if (s) {
          setTrialStatus(s)
          setTrialDaysLeft(body.coach?.days_left ?? null)
        }
      })
      .catch(() => undefined)
  }, [session?.access_token])

  const showBanner = trialStatus === 'expiring' || trialStatus === 'expired'

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
        {showBanner && session?.access_token ? (
          <UpgradePanel
            accessToken={session.access_token}
            status={trialStatus}
            daysLeft={trialDaysLeft}
            variant="banner"
          />
        ) : null}
        <main className="student-program__main student-program__body">{children}</main>
      </div>
    </div>
  )
}
