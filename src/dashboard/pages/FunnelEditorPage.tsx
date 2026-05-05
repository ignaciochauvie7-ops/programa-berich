import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { StepRenderer } from '../../funnel/StepRenderer'
import type { FunnelDefinition, FunnelStep } from '../../funnel/types'
import { parseFunnelDefinition } from '../../funnel/validate'
import { loadFunnelBySlug } from '../../funnel/loadFunnel'
import { clearFunnelDraft, writeFunnelDraft } from '../funnelDraft'
import { FunnelWorkspaceTabs } from './FunnelWorkspaceTabs'

function updateStepInDef(def: FunnelDefinition, stepId: string, update: (step: FunnelStep) => FunnelStep): FunnelDefinition {
  return {
    ...def,
    steps: def.steps.map((step) => (step.id === stepId ? update(step) : step)),
  }
}

function privateNamesKey(slug: string) {
  return `funnel:private-names:${slug}`
}

function readPrivateNames(slug: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(privateNamesKey(slug))
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

function writePrivateNames(slug: string, names: Record<string, string>) {
  try {
    localStorage.setItem(privateNamesKey(slug), JSON.stringify(names))
  } catch {
    /* ignore */
  }
}

function inferBranch(stepId: string): 'hombre' | 'mujer' | null {
  if (stepId.includes('mujer')) return 'mujer'
  if (stepId.includes('hombre')) return 'hombre'
  return null
}

function mapTargets(step: FunnelStep, fromId: string, toId: string): FunnelStep {
  switch (step.type) {
    case 'content':
    case 'question_multi':
    case 'height_slider':
    case 'weight_slider':
    case 'analysis_loading':
    case 'prefinal_loading':
      return step.nextId === fromId ? { ...step, nextId: toId } : step
    case 'question_single':
      return {
        ...step,
        options: step.options.map((o) => (o.nextId === fromId ? { ...o, nextId: toId } : o)),
      }
    case 'video_youtube':
      return {
        ...step,
        ...(step.nextId === fromId ? { nextId: toId } : {}),
        ...(step.formNextId === fromId ? { formNextId: toId } : {}),
      }
    case 'cta_external':
      return step.nextId === fromId ? { ...step, nextId: toId } : step
    default:
      return step
  }
}

function clampNumber(value: string, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function FunnelEditorPage() {
  const { slug = 'entrenamiento' } = useParams<{ slug: string }>()
  const [def, setDef] = useState<FunnelDefinition | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [privateNames, setPrivateNames] = useState<Record<string, string>>({})
  const [past, setPast] = useState<FunnelDefinition[]>([])
  const [future, setFuture] = useState<FunnelDefinition[]>([])

  useEffect(() => {
    let cancelled = false
    loadFunnelBySlug(slug)
      .then((next) => {
        if (cancelled) return
        setDef(next)
        setSelectedId(next.steps[0]?.id ?? '')
        setPrivateNames(readPrivateNames(slug))
        setPast([])
        setFuture([])
        setErr(null)
      })
      .catch((e: unknown) => {
        if (cancelled) return
        setErr(e instanceof Error ? e.message : 'No se pudo cargar el funnel.')
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    writePrivateNames(slug, privateNames)
  }, [privateNames, slug])

  const selectedStep = useMemo(
    () => def?.steps.find((s) => s.id === selectedId) ?? null,
    [def, selectedId],
  )

  const activeOptionId =
    selectedStep?.type === 'question_single'
      ? selectedStep.options.some((o) => o.id === selectedOptionId)
        ? selectedOptionId
        : selectedStep.options[0]?.id ?? null
      : null

  const applyChange = useCallback((updater: (prev: FunnelDefinition) => FunnelDefinition) => {
    setDef((prev) => {
      if (!prev) return prev
      const next = updater(prev)
      setPast((p) => [...p.slice(-99), prev])
      setFuture([])
      return next
    })
  }, [])

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p
      const prevDef = p[p.length - 1]
      setDef((current) => {
        if (current) setFuture((f) => [current, ...f])
        return prevDef
      })
      return p.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f
      const nextDef = f[0]
      setDef((current) => {
        if (current) setPast((p) => [...p.slice(-99), current])
        return nextDef
      })
      return f.slice(1)
    })
  }, [])

  const saveDraft = useCallback(() => {
    if (!def) return
    try {
      parseFunnelDefinition(def)
      writeFunnelDraft(slug, def)
      setNotice('Draft guardado localmente.')
    } catch (e: unknown) {
      setNotice(e instanceof Error ? `Error de validacion: ${e.message}` : 'Error de validacion.')
    }
  }, [def, slug])

  const clearDraft = useCallback(() => {
    clearFunnelDraft(slug)
    setNotice('Draft eliminado. Recarga para volver al JSON publico.')
  }, [slug])

  const exportJson = useCallback(() => {
    if (!def) return
    const blob = new Blob([JSON.stringify(def, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [def, slug])

  if (err) {
    return (
      <section className="admin-page">
        <header className="admin-page__header">
          <h1>Editor de pantallas</h1>
        </header>
        <article className="admin-card admin-card--empty">{err}</article>
      </section>
    )
  }

  if (!def) {
    return (
      <section className="admin-page">
        <header className="admin-page__header">
          <h1>Editor de pantallas</h1>
        </header>
        <article className="admin-card admin-card--empty">Cargando...</article>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Editor: {slug}</h1>
        <div className="admin-card__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={undo} disabled={past.length === 0}>
            Deshacer
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={redo} disabled={future.length === 0}>
            Rehacer
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={saveDraft}>
            Guardar
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={clearDraft}>
            Limpiar draft
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={exportJson}>
            Exportar JSON
          </button>
          <a className="admin-btn admin-btn--ghost" href={`/f/${slug}?restart=1`} target="_blank" rel="noreferrer">
            Abrir preview publica
          </a>
          <Link to="/dashboard/funnels" className="admin-btn admin-btn--ghost">
            Volver
          </Link>
        </div>
      </header>
      <FunnelWorkspaceTabs slug={slug} />
      {notice ? <p className="admin-flow__notice">{notice}</p> : null}

      <div className="admin-editor-pro">
        <aside className="admin-editor-pro__left admin-card">
          <div className="admin-editor-pro__top-actions">
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={() => {
                const newId = `pantalla_${Math.random().toString(36).slice(2, 7)}`
                applyChange((prev) => ({
                  ...prev,
                  steps: [
                    ...prev.steps,
                    {
                      id: newId,
                      type: 'content',
                      headline: 'Nueva pantalla',
                      body: 'Edita este contenido.',
                      nextId: prev.steps[0]?.id ?? newId,
                    },
                  ],
                }))
                setSelectedId(newId)
              }}
            >
              Agregar pantalla
            </button>
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              disabled={!selectedStep || def.steps.length <= 1}
              onClick={() => {
                if (!selectedStep || def.steps.length <= 1) return
                const fallback = def.steps.find((s) => s.id !== selectedStep.id)?.id
                if (!fallback) return
                applyChange((prev) => {
                  const filtered = prev.steps.filter((s) => s.id !== selectedStep.id).map((s) =>
                    mapTargets(s, selectedStep.id, fallback),
                  )
                  return {
                    ...prev,
                    startStepId: prev.startStepId === selectedStep.id ? fallback : prev.startStepId,
                    steps: filtered,
                  }
                })
                setSelectedId(fallback)
              }}
            >
              Eliminar pantalla
            </button>
          </div>
          <div className="admin-editor__steps">
            {def.steps.map((step, index) => (
              <div key={step.id} className={'admin-editor__step-item' + (step.id === selectedId ? ' admin-editor__step-item--active' : '')}>
                <button
                  type="button"
                  className={'admin-editor__step-btn' + (step.id === selectedId ? ' admin-editor__step-btn--active' : '')}
                  onClick={() => setSelectedId(step.id)}
                >
                  <strong>{privateNames[step.id] || step.id}</strong>
                  <span>{step.type}</span>
                </button>
                <div className="admin-editor__step-inline">
                  <input
                    placeholder="Nombre privado"
                    value={privateNames[step.id] ?? ''}
                    onChange={(e) => setPrivateNames((prev) => ({ ...prev, [step.id]: e.target.value }))}
                  />
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    disabled={index === 0}
                    onClick={() =>
                      applyChange((prev) => {
                        const next = [...prev.steps]
                        ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                        return { ...prev, steps: next }
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="admin-btn admin-btn--ghost"
                    disabled={index === def.steps.length - 1}
                    onClick={() =>
                      applyChange((prev) => {
                        const next = [...prev.steps]
                        ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                        return { ...prev, steps: next }
                      })
                    }
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className="admin-editor-pro__center admin-card">
          {selectedStep ? (
            <div className="admin-preview-stage">
              <div className="admin-preview-stage__phone funnel-root" {...(inferBranch(selectedStep.id) ? { 'data-branch': inferBranch(selectedStep.id) } : {})}>
                <div className="funnel-shell">
                  <div className="funnel-card">
                    <StepRenderer step={selectedStep} onGoTo={() => undefined} />
                  </div>
                </div>
              </div>
              {selectedStep.type === 'question_single' ? (
                <div className="admin-preview-stage__picker">
                  <span>Seleccionar opcion para editar estilo:</span>
                  <div className="admin-preview-stage__picker-list">
                    {selectedStep.options.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        className={
                          'admin-btn admin-btn--ghost' + (activeOptionId === opt.id ? ' admin-preview-stage__picker-btn--on' : '')
                        }
                        onClick={() => setSelectedOptionId(opt.id)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p>No hay paso seleccionado.</p>
          )}
        </section>

        <article className="admin-editor-pro__right admin-card">
          {selectedStep ? (
            <>
              <h2>{selectedStep.id}</h2>
              <p className="admin-card__meta">Tipo: {selectedStep.type}</p>

              <label className="admin-field">
                <span>Headline</span>
                <input
                  value={selectedStep.headline ?? ''}
                  onChange={(e) =>
                    applyChange((prev) =>
                      updateStepInDef(prev, selectedStep.id, (step) => ({ ...step, headline: e.target.value || undefined })),
                    )
                  }
                />
              </label>

              <label className="admin-field">
                <span>Body</span>
                <textarea
                  rows={4}
                  value={selectedStep.body ?? ''}
                  onChange={(e) =>
                    applyChange((prev) =>
                      updateStepInDef(prev, selectedStep.id, (step) => ({ ...step, body: e.target.value || undefined })),
                    )
                  }
                />
              </label>

              {'nextId' in selectedStep ? (
                <label className="admin-field">
                  <span>Ir a pantalla (nextId)</span>
                  <select
                    value={selectedStep.nextId ?? ''}
                    onChange={(e) =>
                      applyChange((prev) =>
                        updateStepInDef(prev, selectedStep.id, (step) => ({ ...step, nextId: e.target.value })),
                      )
                    }
                  >
                    {def.steps.map((s) => (
                      <option key={s.id} value={s.id}>
                        {privateNames[s.id] || s.id}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {selectedStep.type === 'question_single' ? (
                <div className="admin-field">
                  <span>Layout de opciones</span>
                  <div className="admin-editor__option-row admin-editor__option-row--3">
                    <label className="admin-field">
                      <span>Gap</span>
                      <input
                        value={selectedStep.style?.gap ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'question_single'
                                ? {
                                    ...step,
                                    style: {
                                      ...step.style,
                                      gap: e.target.value === '' ? undefined : clampNumber(e.target.value, step.style?.gap ?? 8),
                                    },
                                  }
                                : step,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Espacio arriba</span>
                      <input
                        value={selectedStep.style?.topSpace ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'question_single'
                                ? {
                                    ...step,
                                    style: {
                                      ...step.style,
                                      topSpace:
                                        e.target.value === '' ? undefined : clampNumber(e.target.value, step.style?.topSpace ?? 0),
                                    },
                                  }
                                : step,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Espacio abajo</span>
                      <input
                        value={selectedStep.style?.bottomSpace ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'question_single'
                                ? {
                                    ...step,
                                    style: {
                                      ...step.style,
                                      bottomSpace:
                                        e.target.value === '' ? undefined : clampNumber(e.target.value, step.style?.bottomSpace ?? 0),
                                    },
                                  }
                                : step,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {selectedStep.type === 'question_single' && activeOptionId ? (
                <div className="admin-field">
                  <span>Estilo de opcion seleccionada</span>
                  <div className="admin-editor__option-row admin-editor__option-row--3">
                    <label className="admin-field">
                      <span>Color fondo</span>
                      <input
                        type="color"
                        value={selectedStep.style?.options?.[activeOptionId]?.bg ?? '#1a1a1a'}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) => {
                              if (step.type !== 'question_single') return step
                              return {
                                ...step,
                                style: {
                                  ...step.style,
                                  options: {
                                    ...(step.style?.options ?? {}),
                                    [activeOptionId]: {
                                      ...(step.style?.options?.[activeOptionId] ?? {}),
                                      bg: e.target.value,
                                    },
                                  },
                                },
                              }
                            }),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Color texto</span>
                      <input
                        type="color"
                        value={selectedStep.style?.options?.[activeOptionId]?.text ?? '#f4f6fb'}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) => {
                              if (step.type !== 'question_single') return step
                              return {
                                ...step,
                                style: {
                                  ...step.style,
                                  options: {
                                    ...(step.style?.options ?? {}),
                                    [activeOptionId]: {
                                      ...(step.style?.options?.[activeOptionId] ?? {}),
                                      text: e.target.value,
                                    },
                                  },
                                },
                              }
                            }),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Borde redondeado</span>
                      <input
                        value={selectedStep.style?.options?.[activeOptionId]?.radius ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) => {
                              if (step.type !== 'question_single') return step
                              return {
                                ...step,
                                style: {
                                  ...step.style,
                                  options: {
                                    ...(step.style?.options ?? {}),
                                    [activeOptionId]: {
                                      ...(step.style?.options?.[activeOptionId] ?? {}),
                                      radius: e.target.value === '' ? undefined : clampNumber(e.target.value, 14),
                                    },
                                  },
                                },
                              }
                            }),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Tamaño texto</span>
                      <input
                        value={selectedStep.style?.options?.[activeOptionId]?.fontSize ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) => {
                              if (step.type !== 'question_single') return step
                              return {
                                ...step,
                                style: {
                                  ...step.style,
                                  options: {
                                    ...(step.style?.options ?? {}),
                                    [activeOptionId]: {
                                      ...(step.style?.options?.[activeOptionId] ?? {}),
                                      fontSize: e.target.value === '' ? undefined : clampNumber(e.target.value, 16),
                                    },
                                  },
                                },
                              }
                            }),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Ancho %</span>
                      <input
                        value={selectedStep.style?.options?.[activeOptionId]?.width ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) => {
                              if (step.type !== 'question_single') return step
                              return {
                                ...step,
                                style: {
                                  ...step.style,
                                  options: {
                                    ...(step.style?.options ?? {}),
                                    [activeOptionId]: {
                                      ...(step.style?.options?.[activeOptionId] ?? {}),
                                      width: e.target.value === '' ? undefined : clampNumber(e.target.value, 100),
                                    },
                                  },
                                },
                              }
                            }),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Padding Y</span>
                      <input
                        value={selectedStep.style?.options?.[activeOptionId]?.paddingY ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) => {
                              if (step.type !== 'question_single') return step
                              return {
                                ...step,
                                style: {
                                  ...step.style,
                                  options: {
                                    ...(step.style?.options ?? {}),
                                    [activeOptionId]: {
                                      ...(step.style?.options?.[activeOptionId] ?? {}),
                                      paddingY: e.target.value === '' ? undefined : clampNumber(e.target.value, 12),
                                    },
                                  },
                                },
                              }
                            }),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {'media' in selectedStep ? (
                <div className="admin-field">
                  <span>Media</span>
                  <div className="admin-editor__option-row">
                    <select
                      value={selectedStep.media?.kind ?? 'none'}
                      onChange={(e) =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) => {
                            if (e.target.value === 'none') return { ...step, media: undefined }
                            const kind = e.target.value as 'image' | 'video'
                            return {
                              ...step,
                              media: step.media?.kind === kind ? step.media : { kind, src: '' },
                            }
                          }),
                        )
                      }
                    >
                      <option value="none">Sin media</option>
                      <option value="image">Imagen</option>
                      <option value="video">Video</option>
                    </select>
                    <input
                      placeholder="URL media"
                      value={selectedStep.media?.src ?? ''}
                      onChange={(e) =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) =>
                            step.media ? { ...step, media: { ...step.media, src: e.target.value } } : step,
                          ),
                        )
                      }
                    />
                  </div>
                </div>
              ) : null}

              {selectedStep.type === 'question_single' ? (
                <div className="admin-field">
                  <span>Opciones</span>
                  <div className="admin-editor__options">
                    {selectedStep.options.map((opt, idx) => (
                      <div key={opt.id} className="admin-editor__option-block">
                        <div className="admin-editor__option-row">
                          <input
                            value={opt.label}
                            onChange={(e) =>
                              applyChange((prev) =>
                                updateStepInDef(prev, selectedStep.id, (step) =>
                                  step.type === 'question_single'
                                    ? { ...step, options: step.options.map((o) => (o.id === opt.id ? { ...o, label: e.target.value } : o)) }
                                    : step,
                                ),
                              )
                            }
                          />
                          <select
                            value={opt.nextId}
                            onChange={(e) =>
                              applyChange((prev) =>
                                updateStepInDef(prev, selectedStep.id, (step) =>
                                  step.type === 'question_single'
                                    ? { ...step, options: step.options.map((o) => (o.id === opt.id ? { ...o, nextId: e.target.value } : o)) }
                                    : step,
                                ),
                              )
                            }
                          >
                            {def.steps.map((s) => (
                              <option key={s.id} value={s.id}>
                                {privateNames[s.id] || s.id}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="admin-card__actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            disabled={idx === 0}
                            onClick={() =>
                              applyChange((prev) =>
                                updateStepInDef(prev, selectedStep.id, (step) => {
                                  if (step.type !== 'question_single') return step
                                  const next = [...step.options]
                                  ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
                                  return { ...step, options: next }
                                }),
                              )
                            }
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            disabled={idx === selectedStep.options.length - 1}
                            onClick={() =>
                              applyChange((prev) =>
                                updateStepInDef(prev, selectedStep.id, (step) => {
                                  if (step.type !== 'question_single') return step
                                  const next = [...step.options]
                                  ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
                                  return { ...step, options: next }
                                }),
                              )
                            }
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn--ghost"
                            disabled={selectedStep.options.length <= 1}
                            onClick={() =>
                              applyChange((prev) =>
                                updateStepInDef(prev, selectedStep.id, (step) =>
                                  step.type === 'question_single'
                                    ? { ...step, options: step.options.filter((o) => o.id !== opt.id) }
                                    : step,
                                ),
                              )
                            }
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      onClick={() =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) => {
                            if (step.type !== 'question_single') return step
                            const optionId = `opt_${Math.random().toString(36).slice(2, 7)}`
                            return {
                              ...step,
                              options: [
                                ...step.options,
                                { id: optionId, label: 'Nueva opcion', nextId: def.steps[0]?.id ?? step.id },
                              ],
                            }
                          }),
                        )
                      }
                    >
                      Agregar opcion
                    </button>
                  </div>
                </div>
              ) : null}

              {selectedStep.type === 'analysis_loading' ? (
                <div className="admin-field">
                  <span>Carga (analysis_loading)</span>
                  <label className="admin-field">
                    <span>Duracion ms</span>
                    <input
                      value={selectedStep.durationMs ?? ''}
                      onChange={(e) =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) =>
                            step.type === 'analysis_loading'
                              ? { ...step, durationMs: e.target.value === '' ? undefined : clampNumber(e.target.value, 4800) }
                              : step,
                          ),
                        )
                      }
                    />
                  </label>
                  {selectedStep.phases.map((ph, idx) => (
                    <div key={idx} className="admin-editor__option-row">
                      <input
                        value={ph.title}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'analysis_loading'
                                ? {
                                    ...step,
                                    phases: step.phases.map((p, i) => (i === idx ? { ...p, title: e.target.value } : p)),
                                  }
                                : step,
                            ),
                          )
                        }
                      />
                      <input
                        value={ph.weight ?? ''}
                        placeholder="peso"
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'analysis_loading'
                                ? {
                                    ...step,
                                    phases: step.phases.map((p, i) =>
                                      i === idx
                                        ? {
                                            ...p,
                                            weight: e.target.value === '' ? undefined : clampNumber(e.target.value, p.weight ?? 1),
                                          }
                                        : p,
                                    ),
                                  }
                                : step,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedStep.type === 'prefinal_loading' ? (
                <div className="admin-field">
                  <span>Carga (prefinal_loading)</span>
                  <div className="admin-editor__option-row admin-editor__option-row--3">
                    <label className="admin-field">
                      <span>Duracion ms</span>
                      <input
                        value={selectedStep.durationMs ?? ''}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'prefinal_loading'
                                ? { ...step, durationMs: e.target.value === '' ? undefined : clampNumber(e.target.value, 3600) }
                                : step,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Desde %</span>
                      <input
                        value={selectedStep.progressStart}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'prefinal_loading'
                                ? { ...step, progressStart: clampNumber(e.target.value, step.progressStart) }
                                : step,
                            ),
                          )
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Hasta %</span>
                      <input
                        value={selectedStep.progressEnd}
                        onChange={(e) =>
                          applyChange((prev) =>
                            updateStepInDef(prev, selectedStep.id, (step) =>
                              step.type === 'prefinal_loading'
                                ? { ...step, progressEnd: clampNumber(e.target.value, step.progressEnd) }
                                : step,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {selectedStep.type === 'height_slider' ? (
                <div className="admin-editor__option-row">
                  <label className="admin-field">
                    <span>Min cm</span>
                    <input
                      value={selectedStep.minCm}
                      onChange={(e) =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) =>
                            step.type === 'height_slider' ? { ...step, minCm: clampNumber(e.target.value, step.minCm) } : step,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span>Max cm</span>
                    <input
                      value={selectedStep.maxCm}
                      onChange={(e) =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) =>
                            step.type === 'height_slider' ? { ...step, maxCm: clampNumber(e.target.value, step.maxCm) } : step,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              ) : null}

              {selectedStep.type === 'weight_slider' ? (
                <div className="admin-editor__option-row">
                  <label className="admin-field">
                    <span>Min kg</span>
                    <input
                      value={selectedStep.minKg}
                      onChange={(e) =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) =>
                            step.type === 'weight_slider' ? { ...step, minKg: clampNumber(e.target.value, step.minKg) } : step,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="admin-field">
                    <span>Max kg</span>
                    <input
                      value={selectedStep.maxKg}
                      onChange={(e) =>
                        applyChange((prev) =>
                          updateStepInDef(prev, selectedStep.id, (step) =>
                            step.type === 'weight_slider' ? { ...step, maxKg: clampNumber(e.target.value, step.maxKg) } : step,
                          ),
                        )
                      }
                    />
                  </label>
                </div>
              ) : null}
            </>
          ) : (
            <p>No hay paso seleccionado.</p>
          )}
        </article>
      </div>
    </section>
  )
}
