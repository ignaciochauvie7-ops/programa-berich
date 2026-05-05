import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type SetStateAction,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactFlow, {
  Background,
  ConnectionMode,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
  type OnConnectStart,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { FunnelDefinition, FunnelStep } from '../../funnel/types'
import { BodyText } from '../../funnel/BodyText'
import { StepRenderer } from '../../funnel/StepRenderer'
import { loadFunnelBySlug } from '../../funnel/loadFunnel'
import { clearFunnelDraft, readFunnelNodePositions, writeFunnelDraft, writeFunnelNodePositions } from '../funnelDraft'
import { FunnelWorkspaceTabs } from './FunnelWorkspaceTabs'

type StepNodeData = {
  id: string
  type: FunnelStep['type']
  headline?: string
  step: FunnelStep
}

function buildNodes(
  def: FunnelDefinition,
  positionById?: Map<string, { x: number; y: number }>,
): Node<StepNodeData>[] {
  return def.steps.map((step, i) => ({
    id: step.id,
    type: 'step',
    position: positionById?.get(step.id) ?? { x: (i % 3) * 470, y: Math.floor(i / 3) * 470 },
    data: {
      id: step.id,
      type: step.type,
      headline: step.headline,
      step,
    },
    draggable: true,
  }))
}

const HANDLE_BASE_TOP = 88
const HANDLE_GAP = 24

/** Salidas editables en el grafo (una sola o varias). */
function singleExitHandleLayout(step: FunnelStep): { id: string; label: string; top: number }[] {
  switch (step.type) {
    case 'content':
    case 'question_multi':
    case 'height_slider':
    case 'weight_slider':
    case 'analysis_loading':
    case 'prefinal_loading':
      return [{ id: 'nextId', label: 'Siguiente', top: HANDLE_BASE_TOP }]
    case 'video_youtube':
      return [
        { id: 'formNextId', label: 'CTA form', top: HANDLE_BASE_TOP },
        { id: 'nextId', label: 'Continuar', top: HANDLE_BASE_TOP + HANDLE_GAP },
      ]
    case 'cta_external':
      return [{ id: 'nextId', label: 'Siguiente', top: HANDLE_BASE_TOP }]
    default:
      return []
  }
}

/** Puntos de salida visibles: question_single = una por opcion; el resto = salidas del layout si aplica. */
function sourceHandlesForStep(step: FunnelStep): { id: string; label: string; top: number }[] {
  if (step.type === 'question_single') {
    return step.options.map((o, i) => ({
      id: `option:${o.id}`,
      label: o.label,
      top: HANDLE_BASE_TOP + i * HANDLE_GAP,
    }))
  }
  return singleExitHandleLayout(step)
}

function canDragFromSourceHandles(step: FunnelStep): boolean {
  return sourceHandlesForStep(step).length > 0
}

function applyConnection(step: FunnelStep, sourceHandle: string | null, targetId: string): FunnelStep {
  const handle = sourceHandle ?? 'nextId'
  switch (step.type) {
    case 'content':
    case 'question_multi':
    case 'height_slider':
    case 'weight_slider':
    case 'analysis_loading':
    case 'prefinal_loading':
      return { ...step, nextId: targetId }
    case 'question_single':
      if (!handle.startsWith('option:')) return step
      return {
        ...step,
        options: step.options.map((o) => (o.id === handle.slice('option:'.length) ? { ...o, nextId: targetId } : o)),
      }
    case 'video_youtube':
      if (handle === 'formNextId') return { ...step, formNextId: targetId }
      if (handle === 'nextId') return { ...step, nextId: targetId }
      return step
    case 'cta_external':
      return { ...step, nextId: targetId }
    default:
      return step
  }
}

function clearConnectionTarget(step: FunnelStep, sourceHandle: string | null, startStepId: string): FunnelStep {
  const handle = sourceHandle ?? 'nextId'
  switch (step.type) {
    case 'content':
    case 'question_multi':
    case 'height_slider':
    case 'weight_slider':
    case 'analysis_loading':
    case 'prefinal_loading':
      return { ...step, nextId: startStepId }
    case 'question_single':
      if (!handle.startsWith('option:')) return step
      const optId = handle.slice('option:'.length)
      return {
        ...step,
        options: step.options.map((o) => (o.id === optId ? { ...o, nextId: startStepId } : o)),
      }
    case 'video_youtube':
      if (handle === 'formNextId') return { ...step, formNextId: undefined }
      if (handle === 'nextId') return { ...step, nextId: undefined }
      return step
    case 'cta_external':
      if (handle === 'nextId') return { ...step, nextId: undefined }
      return step
    default:
      return step
  }
}

function resetAllConnections(def: FunnelDefinition): FunnelDefinition {
  const start = def.startStepId
  return {
    ...def,
    steps: def.steps.map((step) => {
      switch (step.type) {
        case 'content':
        case 'question_multi':
        case 'height_slider':
        case 'weight_slider':
        case 'analysis_loading':
        case 'prefinal_loading':
          return { ...step, nextId: start }
        case 'question_single':
          return { ...step, options: step.options.map((o) => ({ ...o, nextId: start })) }
        case 'video_youtube':
          return { ...step, formNextId: undefined, nextId: undefined }
        case 'cta_external':
          return { ...step, nextId: undefined }
        default:
          return step
      }
    }),
  }
}

function inferBranch(stepId: string): 'hombre' | 'mujer' | null {
  if (stepId.includes('mujer')) return 'mujer'
  if (stepId.includes('hombre')) return 'hombre'
  return null
}

function MiniStepPreview({ step }: { step: FunnelStep }) {
  if (step.type === 'video_youtube') {
    return (
      <article className="funnel-step funnel-step--landing" aria-label="Vista previa de video">
        {step.headline ? <h1 className="funnel-headline funnel-headline--hero">{step.headline}</h1> : null}
        <BodyText text={step.body} />
        <div className="funnel-youtube flow-mini-youtube">
          <span>Vista previa de YouTube</span>
        </div>
      </article>
    )
  }

  if (step.type === 'analysis_loading' || step.type === 'prefinal_loading') {
    return (
      <article className="funnel-step funnel-step--landing" aria-label="Vista previa de carga">
        {step.headline ? <h1 className="funnel-headline">{step.headline}</h1> : null}
        <BodyText text={step.body} />
        <div className="flow-mini-loading">
          <div className="flow-mini-loading__bar" />
          <span>Carga automatica en el funnel publico</span>
        </div>
      </article>
    )
  }

  if (step.type === 'berich_close') {
    return (
      <article className="funnel-step funnel-step--landing" aria-label="Vista previa de cierre">
        <h1 className="funnel-headline">Tu transformacion empieza aca</h1>
        <p className="funnel-body">Pantalla de cierre completa con videos, planes, grilla y FAQ.</p>
        <div className="flow-mini-close">Vista resumida del cierre</div>
      </article>
    )
  }

  return <StepRenderer step={step} onGoTo={() => undefined} />
}

function StepNode({ data, isConnectable = true }: NodeProps<StepNodeData>) {
  const branch = inferBranch(data.id)
  const branchAttr = branch ? ({ 'data-branch': branch } as const) : {}
  const handles = sourceHandlesForStep(data.step)
  const allowSourceDrag = isConnectable && canDragFromSourceHandles(data.step)

  return (
    <div className="flow-node">
      <Handle
        type="target"
        position={Position.Left}
        className="flow-node__handle-target"
        isConnectable={isConnectable}
        isConnectableEnd
      />
      <div className="flow-node__id">{data.id}</div>
      <div className="flow-node__type">{data.type}</div>
      <div className="flow-node__preview funnel-root nodrag nopan" {...branchAttr}>
        <div className="funnel-shell">
          <div className="funnel-card">
            <MiniStepPreview step={data.step} />
          </div>
        </div>
      </div>
      {handles.length > 0 ? (
        <div className="flow-node__manual-handles" aria-hidden={!allowSourceDrag}>
          {handles.map((h) => (
            <div key={h.id} className="flow-node__manual-handle-row">
              <span className="flow-node__manual-handle-label">{h.label}</span>
              <Handle
                id={h.id}
                type="source"
                position={Position.Right}
                className="flow-node__handle-dot"
                style={{ top: h.top }}
                isConnectable={allowSourceDrag}
                isConnectableStart={allowSourceDrag}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="flow-node__no-handles">Sin salida en el grafo (fin de funnel o solo enlaces externos).</p>
      )}
    </div>
  )
}

const nodeTypes = { step: StepNode }

const COPY_CLIPBOARD_KEY = 'funnel:builder:step-clipboard'

function pickUniqueStepId(def: FunnelDefinition, baseId: string): string {
  const used = new Set(def.steps.map((s) => s.id))
  let id = `${baseId}_copy`
  let n = 2
  while (used.has(id)) {
    id = `${baseId}_copy${n}`
    n += 1
  }
  return id
}

function cloneStepWithNewId(step: FunnelStep, newId: string): FunnelStep {
  const c = structuredClone(step) as FunnelStep
  c.id = newId
  return c
}

function insertDuplicatedStep(
  setDef: Dispatch<SetStateAction<FunnelDefinition | null>>,
  setNodes: Dispatch<SetStateAction<Node<StepNodeData>[]>>,
  sourceStep: FunnelStep,
  refNodeIdForPosition: string,
) {
  setDef((prev) => {
    if (!prev) return prev
    const newId = pickUniqueStepId(prev, sourceStep.id)
    const newStep = cloneStepWithNewId(sourceStep, newId)
    setNodes((prevNodes) => {
      const refNode = prevNodes.find((n) => n.id === refNodeIdForPosition)
      const pos = refNode ? { x: refNode.position.x + 56, y: refNode.position.y + 56 } : { x: 120, y: 120 }
      return [
        ...prevNodes.map((n) => ({ ...n, selected: false })),
        {
          id: newId,
          type: 'step',
          position: pos,
          data: {
            id: newId,
            type: newStep.type,
            headline: newStep.headline,
            step: newStep,
          },
          draggable: true,
          selected: true,
        },
      ]
    })
    return { ...prev, steps: [...prev.steps, newStep] }
  })
}

type ShortcutsProps = {
  defRef: MutableRefObject<FunnelDefinition | null>
  setDef: Dispatch<SetStateAction<FunnelDefinition | null>>
  setNodes: Dispatch<SetStateAction<Node<StepNodeData>[]>>
  setSaving: Dispatch<SetStateAction<string | null>>
}

/** Debe renderizarse como hijo directo de ReactFlow para usar useReactFlow. */
function BuilderFlowShortcuts({ defRef, setDef, setNodes, setSaving }: ShortcutsProps) {
  const { getNodes } = useReactFlow()

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      const t = e.target as HTMLElement
      if (t?.closest?.('input, textarea, [contenteditable="true"]')) return

      if (meta && e.code === 'KeyC') {
        const def = defRef.current
        if (!def) return
        const selected = getNodes().filter((n) => n.selected && n.type === 'step')
        if (selected.length !== 1) return
        const step = def.steps.find((s) => s.id === selected[0].id)
        if (!step) return
        try {
          sessionStorage.setItem(COPY_CLIPBOARD_KEY, JSON.stringify(step))
          setSaving('Pantalla copiada.')
          e.preventDefault()
        } catch {
          /* ignore quota */
        }
        return
      }

      if (meta && e.code === 'KeyV') {
        const raw = sessionStorage.getItem(COPY_CLIPBOARD_KEY)
        if (!raw) return
        let parsed: FunnelStep
        try {
          parsed = JSON.parse(raw) as FunnelStep
        } catch {
          return
        }
        if (!parsed?.id || !parsed?.type) return
        const nodesNow = getNodes()
        const selected = nodesNow.filter((n) => n.selected && n.type === 'step')
        const refId = selected[0]?.id ?? nodesNow.filter((n) => n.type === 'step').at(-1)?.id ?? parsed.id
        insertDuplicatedStep(setDef, setNodes, parsed, refId)
        setSaving('Pantalla pegada. Muevela y guarda draft.')
        e.preventDefault()
        return
      }

      if (meta && e.code === 'KeyD') {
        const def = defRef.current
        if (!def) return
        const selected = getNodes().filter((n) => n.selected && n.type === 'step')
        if (selected.length !== 1) return
        const step = def.steps.find((s) => s.id === selected[0].id)
        if (!step) return
        insertDuplicatedStep(setDef, setNodes, step, selected[0].id)
        setSaving('Pantalla duplicada. Muevela y guarda draft.')
        e.preventDefault()
      }
    },
    [defRef, getNodes, setDef, setNodes, setSaving],
  )

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  return null
}

function BuilderInner() {
  const { slug = 'entrenamiento' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [def, setDef] = useState<FunnelDefinition | null>(null)
  const defRef = useRef<FunnelDefinition | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node<StepNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedStepIds, setSelectedStepIds] = useState<string[]>([])

  const connectionMadeRef = useRef(false)
  const connectOriginRef = useRef<{ source: string; sourceHandle: string | null } | null>(null)

  useEffect(() => {
    defRef.current = def
  }, [def])

  const commitConnection = useCallback((connection: Connection) => {
    const source = connection.source
    const target = connection.target
    if (!source || !target || source === target) return
    const handleKey = connection.sourceHandle ?? 'nextId'
    const edgeId = `${source}:${handleKey}->${target}`
    setDef((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        steps: prev.steps.map((step) =>
          step.id === source ? applyConnection(step, connection.sourceHandle ?? null, target) : step,
        ),
      }
    })
    setEdges((prev) => {
      const filtered = prev.filter((e) => !(e.source === source && e.sourceHandle === handleKey))
      return [
        ...filtered,
        {
          id: edgeId,
          source,
          sourceHandle: connection.sourceHandle,
          target,
          markerEnd: { type: MarkerType.ArrowClosed },
          animated: false,
        },
      ]
    })
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      connectionMadeRef.current = true
      commitConnection(connection)
    },
    [commitConnection],
  )

  const onConnectStart: OnConnectStart = useCallback((_, p) => {
    connectionMadeRef.current = false
    connectOriginRef.current = p.nodeId ? { source: p.nodeId, sourceHandle: p.handleId } : null
  }, [])

  const onConnectEnd = useCallback(
    (event: globalThis.MouseEvent | TouchEvent) => {
      if (connectionMadeRef.current) {
        connectionMadeRef.current = false
        connectOriginRef.current = null
        return
      }
      const origin = connectOriginRef.current
      connectOriginRef.current = null
      if (!origin) return
      const tgt = event.target as HTMLElement | null
      const nodeEl = tgt?.closest?.('.react-flow__node')
      const targetId = nodeEl?.getAttribute('data-id')
      if (!targetId || targetId === origin.source) return
      commitConnection({
        source: origin.source,
        target: targetId,
        sourceHandle: origin.sourceHandle,
        targetHandle: null,
      })
    },
    [commitConnection],
  )

  useEffect(() => {
    let cancelled = false
    loadFunnelBySlug(slug)
      .then((next) => {
        if (!cancelled) {
          const savedPos = readFunnelNodePositions(slug)
          setDef(next)
          setNodes(buildNodes(next, new Map(Object.entries(savedPos))))
          setEdges([])
          setSelectedStepIds([])
          setErr(null)
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'No se pudo cargar el funnel.')
        }
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!def) return
    setNodes((prev) =>
      prev.map((n) => {
        const step = def.steps.find((s) => s.id === n.id)
        if (!step) return n
        return {
          ...n,
          data: {
            ...n.data,
            id: step.id,
            type: step.type,
            headline: step.headline,
            step,
          },
        }
      }),
    )
  }, [def])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => {
      const removed = changes
        .filter((c): c is { type: 'remove'; id: string } => c.type === 'remove')
        .map((c) => prev.find((e) => e.id === c.id))
        .filter((e): e is Edge => e != null)
      if (removed.length) {
        setDef((prevDef) => {
          if (!prevDef) return prevDef
          let d = prevDef
          for (const e of removed) {
            d = {
              ...d,
              steps: d.steps.map((s) =>
                s.id === e.source ? clearConnectionTarget(s, e.sourceHandle ?? null, d.startStepId) : s,
              ),
            }
          }
          return d
        })
      }
      return applyEdgeChanges(changes, prev)
    })
  }, [])

  const isValidConnection = useCallback((c: Connection) => {
    if (!c.source || !c.target) return false
    if (c.source === c.target) return false
    return true
  }, [])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedStepIds(sel.filter((n) => n.type === 'step').map((n) => n.id))
  }, [])

  const onNodeDoubleClick = useCallback(
    (_evt: ReactMouseEvent, node: Node) => {
      navigate(`/control/funnels/${slug}/editor?step=${encodeURIComponent(node.id)}`)
    },
    [navigate, slug],
  )

  const saveDraft = useCallback(() => {
    if (!def) return
    writeFunnelDraft(slug, def)
    setSaving('Draft guardado localmente.')
  }, [def, slug])

  const clearDraft = useCallback(() => {
    clearFunnelDraft(slug)
    setSaving('Draft eliminado. Recarga para volver al JSON publico.')
  }, [slug])

  const resetConnections = useCallback(() => {
    if (!def) return
    const next = resetAllConnections(def)
    setDef(next)
    setEdges([])
    setSaving('Conexiones reiniciadas al paso inicial. Guarda draft para persistir.')
  }, [def])

  useEffect(() => {
    if (nodes.length === 0) return
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n.position]))
    writeFunnelNodePositions(slug, byId)
  }, [nodes, slug])

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

  const duplicateSelected = useCallback(() => {
    if (!def || selectedStepIds.length !== 1) {
      setSaving(
        selectedStepIds.length === 0
          ? 'Selecciona una pantalla en el canvas (un clic sobre el nodo).'
          : 'Duplicar de a una pantalla a la vez.',
      )
      return
    }
    const step = def.steps.find((s) => s.id === selectedStepIds[0])
    if (!step) return
    insertDuplicatedStep(setDef, setNodes, step, selectedStepIds[0])
    setSaving('Pantalla duplicada. Muevela y guarda draft.')
  }, [def, selectedStepIds, setDef, setNodes])

  if (err) {
    return (
      <section className="admin-page">
        <header className="admin-page__header">
          <h1>Builder de Funnel</h1>
        </header>
        <article className="admin-card admin-card--empty">{err}</article>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Builder visual: {slug}</h1>
        <div className="admin-card__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={saveDraft}>
            Guardar draft local
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={clearDraft}>
            Limpiar draft
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={resetConnections}>
            Reiniciar conexiones
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={duplicateSelected}
            disabled={selectedStepIds.length !== 1}
          >
            Duplicar pantalla
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={exportJson}>
            Exportar JSON
          </button>
          <a className="admin-btn admin-btn--ghost" href={`/f/${slug}?restart=1`} target="_blank" rel="noreferrer">
            Abrir preview publica
          </a>
          <Link to="/control/funnels" className="admin-btn admin-btn--ghost">
            Volver
          </Link>
        </div>
      </header>
      <FunnelWorkspaceTabs slug={slug} />
      <p className="admin-page__subtitle">
        Cada pantalla con siguiente paso muestra su punto verde de salida sin pasos extra. Preguntas de una opcion: un
        punto por respuesta. Arrastra al nodo destino (o soltá sobre el nodo). Doble clic abre el editor. Duplicar:
        boton arriba, o <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>D</kbd>, o copiar y pegar <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+
        <kbd>C</kbd> / <kbd>V</kbd>.
      </p>
      {saving ? <p className="admin-flow__notice">{saving}</p> : null}
      <div className="admin-flow">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onSelectionChange={onSelectionChange}
          onNodeDoubleClick={onNodeDoubleClick}
          isValidConnection={isValidConnection}
          connectionMode={ConnectionMode.Loose}
          connectionRadius={64}
          connectOnClick={false}
          nodesConnectable
          nodesDraggable
          elementsSelectable
          minZoom={0.05}
          maxZoom={1.8}
          fitView
          defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
        >
          <BuilderFlowShortcuts defRef={defRef} setDef={setDef} setNodes={setNodes} setSaving={setSaving} />
          <Background gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
      <section className="admin-card">
        <h2 className="admin-flow__legend-title">Leyenda rapida</h2>
        <ul className="admin-flow__legend">
          <li>
            <strong>question_single</strong>: un punto verde por cada opcion; el resto con <code>nextId</code> u hacia
            siguiente interno: un punto &quot;Siguiente&quot; (o CTA + Continuar en video).
          </li>
          <li>
            Duplicar: boton <strong>Duplicar pantalla</strong>, o <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>+<kbd>D</kbd>, o copiar
            / pegar.
          </li>
          <li>Doble clic: Editor. Suprimir con una arista seleccionada: borra esa conexion.</li>
        </ul>
      </section>
    </section>
  )
}

export function FunnelBuilderPage() {
  return (
    <ReactFlowProvider>
      <BuilderInner />
    </ReactFlowProvider>
  )
}
