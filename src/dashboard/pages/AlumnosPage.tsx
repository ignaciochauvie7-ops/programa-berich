import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../../auth/supabaseClient'

type Alumno = {
  id: string
  user_id: string | null
  email: string
  nombre: string | null
  created_at: string
  activo: boolean
}

type ApiListResponse = {
  alumnos?: Alumno[]
  error?: string
}

type ApiInviteResponse = {
  alumno?: Alumno
  error?: string
}

export function AlumnosPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([])
  const [nombre, setNombre] = useState('')
  const [apellido, setApellido] = useState('')
  const [email, setEmail] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function getAccessToken() {
    if (!supabase) return null
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  async function loadAlumnos() {
    setLoading(true)
    setError(null)

    const token = await getAccessToken()
    if (!token) {
      setError('No se encontró una sesión activa.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/alumnos', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = (await res.json()) as ApiListResponse
      if (!res.ok) {
        setError(body.error ?? 'No se pudieron cargar los alumnos.')
        setLoading(false)
        return
      }
      setAlumnos(body.alumnos ?? [])
    } catch {
      setError('Error de red al cargar alumnos.')
    }

    setLoading(false)
  }

  useEffect(() => {
    void loadAlumnos()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setBusy(true)
    const nombreCompleto = [nombre.trim(), apellido.trim()].filter(Boolean).join(' ')

    const token = await getAccessToken()
    if (!token) {
      setError('No se encontró una sesión activa.')
      setBusy(false)
      return
    }

    try {
      const res = await fetch('/api/alumnos', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, nombre: nombreCompleto }),
      })
      const body = (await res.json()) as ApiInviteResponse
      if (!res.ok || !body.alumno) {
        setError(body.error ?? 'No se pudo enviar la invitación.')
        setBusy(false)
        return
      }

      setAlumnos((current) => [body.alumno!, ...current.filter((alumno) => alumno.id !== body.alumno!.id)])
      setNombre('')
      setApellido('')
      setEmail('')
      setModalOpen(false)
      setMessage('Invitación enviada correctamente.')
    } catch {
      setError('Error de red al enviar la invitación.')
    }

    setBusy(false)
  }

  async function deleteAlumno(alumno: Alumno) {
    const confirmed = window.confirm(`¿Eliminar a ${alumno.nombre || alumno.email}? Esta acción quita su acceso.`)
    if (!confirmed) return

    setError(null)
    setMessage(null)
    setDeletingId(alumno.id)

    const token = await getAccessToken()
    if (!token) {
      setError('No se encontró una sesión activa.')
      setDeletingId(null)
      return
    }

    try {
      const res = await fetch(`/api/alumnos?id=${encodeURIComponent(alumno.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = (await res.json()) as { error?: string }
      if (!res.ok) {
        setError(body.error ?? 'No se pudo eliminar el alumno.')
        setDeletingId(null)
        return
      }

      setAlumnos((current) => current.filter((item) => item.id !== alumno.id))
      setMessage('Alumno eliminado correctamente.')
    } catch {
      setError('Error de red al eliminar alumno.')
    }

    setDeletingId(null)
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <div>
          <h1>Alumnos</h1>
          <p className="admin-page__subtitle">Creá accesos al programa enviando una invitación por email.</p>
        </div>
        <div className="admin-page__actions">
          <button type="button" className="admin-btn admin-btn--ghost">
            Exportar CRM
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={() => setModalOpen(true)}>
            + Agregar alumno
          </button>
        </div>
      </header>

      {message ? <p className="admin-form__message">{message}</p> : null}
      {error ? <p className="admin-form__error">{error}</p> : null}

      {modalOpen ? (
        <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="invite-alumno-title">
          <form className="admin-card admin-modal__card" onSubmit={onSubmit}>
            <div className="admin-modal__header">
              <h2 id="invite-alumno-title">Invitar alumno</h2>
            </div>
            <div className="admin-form__field">
              <label htmlFor="alumno-nombre">Nombre</label>
              <input
                id="alumno-nombre"
                name="nombre"
                type="text"
                autoComplete="given-name"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                required
              />
            </div>
            <div className="admin-form__field">
              <label htmlFor="alumno-apellido">Apellido</label>
              <input
                id="alumno-apellido"
                name="apellido"
                type="text"
                autoComplete="family-name"
                value={apellido}
                onChange={(event) => setApellido(event.target.value)}
                required
              />
            </div>
            <div className="admin-form__field">
              <label htmlFor="alumno-email">Email</label>
              <input
                id="alumno-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error ? <p className="admin-form__error">{error}</p> : null}
            <div className="admin-modal__actions">
              <button type="submit" className="admin-btn admin-btn--cyan" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar invitación'}
              </button>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Fecha creación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>
                  Cargando alumnos…
                </td>
              </tr>
            ) : alumnos.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', opacity: 0.5 }}>
                  Sin alumnos todavía
                </td>
              </tr>
            ) : (
              alumnos.map((alumno) => (
                <tr key={alumno.id}>
                  <td>{alumno.nombre || '-'}</td>
                  <td>{alumno.email}</td>
                  <td>{new Date(alumno.created_at).toLocaleDateString('es-UY')}</td>
                  <td>
                    <span className={alumno.activo ? 'admin-pill admin-pill--active' : 'admin-pill'}>
                      {alumno.activo ? 'Activo' : 'Pendiente'}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--danger"
                      disabled={deletingId === alumno.id}
                      onClick={() => void deleteAlumno(alumno)}
                    >
                      {deletingId === alumno.id ? 'Eliminando…' : 'Eliminar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
