import { useState, useEffect } from 'react'
import { supabase } from '../auth/supabaseClient'

interface AffData {
  id: string
  email: string
  code: string | null
  link: string
  stats: {
    totalSales: number
    totalUsd: number
    totalCommission: number
    paidCommission: number
    pendingCommission: number
  }
}

const usd = (n: number) => `$${n.toFixed(2)}`

export function AffiliateSection() {
  const [data, setData] = useState<AffData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const fetchData = async () => {
    if (!supabase) { setLoading(false); return }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setLoading(false); return }

    const res = await fetch('/api/affiliates/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (res.status === 404) { setNotFound(true); setLoading(false); return }
    if (res.ok) setData(await res.json() as AffData)
    setLoading(false)
  }

  useEffect(() => { void fetchData() }, [])

  const saveCode = async () => {
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    setSaving(true)
    setCodeError(null)
    const res = await fetch('/api/affiliates/me', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: codeInput }),
    })
    const body = await res.json() as { error?: string }
    setSaving(false)
    if (!res.ok) { setCodeError(body.error ?? 'Error al guardar'); return }
    setEditing(false)
    void fetchData()
  }

  const copyLink = () => {
    if (!data?.link) return
    navigator.clipboard.writeText(data.link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <p style={{ color: 'rgba(216,255,240,0.55)', marginTop: '1.5rem' }}>Cargando…</p>

  if (notFound) return (
    <p style={{ marginTop: '1.5rem', color: 'rgba(216,255,240,0.5)', fontSize: '0.9rem' }}>
      Tu acceso de afiliado estará disponible en breve.
    </p>
  )

  if (!data) return null

  const card = (label: string, value: string, accent?: boolean) => (
    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 14, padding: '0.85rem 1rem' }}>
      <p style={{ margin: 0, fontSize: '0.76rem', color: 'rgba(216,255,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
      <p style={{ margin: '0.25rem 0 0', fontSize: '1.35rem', fontWeight: 700, color: accent ? '#00e676' : '#d8fff0' }}>{value}</p>
    </div>
  )

  return (
    <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#d8fff0' }}>Programa de Afiliados</h2>
      <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(216,255,240,0.55)', lineHeight: 1.5 }}>
        Compartí tu link y ganás un <strong style={{ color: '#00e676' }}>30%</strong> de comisión por cada venta que generes.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px,1fr))', gap: '0.7rem' }}>
        {card('Ventas', String(data.stats.totalSales))}
        {card('Facturado', usd(data.stats.totalUsd))}
        {card('Comisión ganada', usd(data.stats.totalCommission))}
        {card('Pendiente de cobro', usd(data.stats.pendingCommission), true)}
      </div>

      {/* Link */}
      <div style={{ background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.18)', borderRadius: 14, padding: '1rem 1.15rem' }}>
        <p style={{ margin: '0 0 0.55rem', fontSize: '0.76rem', color: 'rgba(216,255,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tu link de afiliado
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <code style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0,230,118,0.14)', borderRadius: 10, padding: '0.5rem 0.75rem', fontSize: '0.85rem', color: '#b3ffe0', wordBreak: 'break-all' }}>
            {data.link}
          </code>
          <button
            type="button"
            onClick={copyLink}
            style={{ background: copied ? 'rgba(0,230,118,0.18)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,230,118,0.28)', borderRadius: 10, padding: '0.5rem 0.9rem', color: copied ? '#00e676' : '#d8fff0', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
          >
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      {/* Custom code */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1rem 1.15rem' }}>
        <p style={{ margin: '0 0 0.55rem', fontSize: '0.76rem', color: 'rgba(216,255,240,0.5)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Código personalizado
        </p>
        {!editing ? (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {data.code
              ? <code style={{ background: 'rgba(0,230,118,0.12)', padding: '0.35rem 0.8rem', borderRadius: 8, color: '#00e676', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em' }}>{data.code}</code>
              : <span style={{ color: 'rgba(216,255,240,0.45)', fontSize: '0.88rem' }}>Sin código — elegí uno para personalizar tu link</span>
            }
            <button
              type="button"
              onClick={() => { setEditing(true); setCodeInput(data.code ?? ''); setCodeError(null) }}
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '0.35rem 0.75rem', color: '#d8fff0', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              {data.code ? 'Cambiar' : 'Elegir código'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                value={codeInput}
                onChange={e => setCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                placeholder="TU_CODIGO"
                maxLength={20}
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(0,230,118,0.35)', borderRadius: 10, padding: '0.55rem 0.8rem', color: '#00e676', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.06em', width: 175 }}
              />
              <button
                type="button"
                disabled={saving || codeInput.length < 3}
                onClick={saveCode}
                style={{ background: 'linear-gradient(135deg,#00e676,#00a85a)', border: 'none', borderRadius: 10, padding: '0.55rem 1rem', color: '#042b18', fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem', opacity: codeInput.length < 3 ? 0.5 : 1 }}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '0.55rem 0.75rem', color: 'rgba(216,255,240,0.55)', cursor: 'pointer', fontSize: '0.88rem' }}
              >
                Cancelar
              </button>
            </div>
            {codeError && <p style={{ margin: 0, color: '#ffb4b4', fontSize: '0.85rem' }}>{codeError}</p>}
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'rgba(216,255,240,0.38)' }}>
              3–20 caracteres, solo letras y números. Ej: JUAN o MARIA2024
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
