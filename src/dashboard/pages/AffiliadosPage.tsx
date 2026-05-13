import { useState, useEffect, useCallback } from 'react'

type Period = 'today' | 'week' | 'month' | 'all'

interface AffRow {
  id: string
  email: string
  code: string | null
  link: string
  salesCount: number
  totalUsd: number
  commissionUsd: number
  paidUsd: number
  pendingUsd: number
}

interface Stats {
  rows: AffRow[]
  totals: { salesCount: number; totalUsd: number; commissionUsd: number; pendingUsd: number }
}

const PERIODS: { id: Period; label: string }[] = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta semana' },
  { id: 'month', label: 'Este mes' },
  { id: 'all', label: 'Todo' },
]

const usd = (n: number) => `$${n.toFixed(2)}`

export function AffiliadosPage() {
  const [period, setPeriod] = useState<Period>('all')
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<AffRow | null>(null)
  const [buyer, setBuyer] = useState('')
  const [amount, setAmount] = useState('49')
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const load = useCallback((p: Period) => {
    setLoading(true)
    fetch(`/api/affiliates/stats?period=${p}`)
      .then(r => r.json() as Promise<Stats>)
      .then(d => { setStats(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load(period) }, [period, load])

  const handleMarkPaid = async (row: AffRow) => {
    if (!confirm(`¿Marcar todas las comisiones pendientes de ${row.email} como pagadas?`)) return
    await fetch('/api/affiliates/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliateEmail: row.email }),
    })
    load(period)
  }

  const handleRecordSale = async () => {
    if (!modal || !buyer.trim()) return
    setSubmitting(true)
    setModalError(null)
    const res = await fetch('/api/affiliates/record-sale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ affiliateEmail: modal.email, buyerEmail: buyer.trim(), saleAmountUsd: Number(amount) }),
    })
    const data = await res.json() as { error?: string }
    setSubmitting(false)
    if (!res.ok) { setModalError(data.error ?? 'Error'); return }
    setModal(null)
    setBuyer('')
    load(period)
  }

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <div>
          <h1>Afiliados</h1>
          <p className="admin-page__subtitle">Comisión: 30% por venta · Precio base: $49 USD</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            type="button"
            className={`admin-btn ${period === p.id ? 'admin-btn--primary' : 'admin-btn--ghost'}`}
            style={{ padding: '0.4rem 0.9rem' }}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {stats && (
        <div className="admin-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))' }}>
          {[
            { label: 'Ventas', value: String(stats.totals.salesCount) },
            { label: 'Facturado', value: usd(stats.totals.totalUsd) },
            { label: 'Comisiones', value: usd(stats.totals.commissionUsd) },
            { label: 'Pendiente pago', value: usd(stats.totals.pendingUsd), accent: true },
          ].map(c => (
            <div key={c.label} className="admin-card">
              <p className="admin-card__meta" style={{ fontSize: '0.8rem', margin: 0 }}>{c.label}</p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '1.5rem', fontWeight: 700, color: c.accent ? '#00e676' : undefined }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? <p>Cargando…</p> : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Código / Link</th>
                <th>Ventas</th>
                <th>Total</th>
                <th>Comisión</th>
                <th>Pendiente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(stats?.rows.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'rgba(244,246,251,0.45)' }}>
                    Sin afiliados todavía
                  </td>
                </tr>
              ) : stats?.rows.map(row => (
                <tr key={row.id}>
                  <td style={{ fontSize: '0.88rem' }}>{row.email}</td>
                  <td>
                    {row.code ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <code style={{ background: 'rgba(0,230,118,0.12)', padding: '0.1rem 0.45rem', borderRadius: 6, color: '#00e676', fontSize: '0.82rem', fontWeight: 700 }}>
                          {row.code}
                        </code>
                        <span style={{ fontSize: '0.72rem', color: 'rgba(244,246,251,0.38)', wordBreak: 'break-all' }}>
                          {row.link}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'rgba(244,246,251,0.35)', fontSize: '0.82rem' }}>Sin código</span>
                    )}
                  </td>
                  <td>{row.salesCount}</td>
                  <td>{usd(row.totalUsd)}</td>
                  <td>{usd(row.commissionUsd)}</td>
                  <td style={{ color: row.pendingUsd > 0 ? '#00e676' : undefined, fontWeight: row.pendingUsd > 0 ? 700 : undefined }}>
                    {usd(row.pendingUsd)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn--ghost"
                        style={{ padding: '0.28rem 0.6rem', fontSize: '0.78rem' }}
                        onClick={() => { setModal(row); setBuyer(''); setAmount('49'); setModalError(null) }}
                      >
                        + Venta
                      </button>
                      {row.pendingUsd > 0 && (
                        <button
                          type="button"
                          className="admin-btn admin-btn--primary"
                          style={{ padding: '0.28rem 0.6rem', fontSize: '0.78rem' }}
                          onClick={() => handleMarkPaid(row)}
                        >
                          Pagado
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null) }}
        >
          <div className="admin-card" style={{ width: '100%', maxWidth: 400, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Registrar venta — {modal.email}</h3>
            {[
              { label: 'Email del comprador', type: 'email', value: buyer, set: setBuyer, placeholder: 'comprador@mail.com' },
              { label: 'Monto USD', type: 'number', value: amount, set: setAmount, placeholder: '49' },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.78rem', color: 'rgba(244,246,251,0.55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, padding: '0.6rem 0.8rem', color: '#f4f6fb', fontSize: '0.95rem' }}
                />
              </div>
            ))}
            {modalError && <p style={{ margin: 0, color: '#ffb4b4', fontSize: '0.88rem' }}>{modalError}</p>}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => setModal(null)}>Cancelar</button>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={submitting || !buyer.trim()}
                onClick={handleRecordSale}
              >
                {submitting ? 'Guardando…' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
