import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
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
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeProps,
  type NodeChange,
  type OnConnectStart,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { FunnelDefinition, FunnelStep } from '../../funnel/types'
import { loadFunnelBySlug } from '../../funnel/loadFunnel'
import { readFunnelNodePositions, writeFunnelDraft, writeFunnelNodePositions } from '../funnelDraft'
import { FunnelWorkspaceTabs } from './FunnelWorkspaceTabs'

type StepNodeData = {
  id: string
  type: FunnelStep['type']
  headline?: string
  step: FunnelStep
}

const PRESET_POSITIONS: Record<string, { x: number; y: number }> = {
  inicio: { x: 520, y: 40 },
  form_intro: { x: 520, y: 240 },
  q_sexo: { x: 520, y: 450 },

  edad_hombre: { x: 130, y: 690 },
  altura_hombre: { x: 130, y: 910 },
  peso_hombre: { x: 130, y: 1130 },
  carga_hombre: { x: 130, y: 1350 },
  objetivo_hombre: { x: 130, y: 1570 },

  edad_mujer: { x: 910, y: 690 },
  altura_mujer: { x: 910, y: 910 },
  peso_mujer: { x: 910, y: 1130 },
  carga_mujer: { x: 910, y: 1350 },
  objetivo_mujer: { x: 910, y: 1570 },
}

function buildNodes(
  def: FunnelDefinition,
  positionById?: Map<string, { x: number; y: number }>,
): Node<StepNodeData>[] {
  return def.steps.map((step, i) => ({
    id: step.id,
    type: 'step',
    position:
      positionById?.get(step.id) ??
      PRESET_POSITIONS[step.id] ?? { x: (i % 3) * 470, y: Math.floor(i / 3) * 470 },
    data: {
      id: step.id,
      type: step.type,
      headline: step.headline,
      step,
    },
    draggable: true,
  }))
}

const HANDLE_BASE_TOP = 54
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

function buildEdges(def: FunnelDefinition): Edge[] {
  const stepIds = new Set(def.steps.map((s) => s.id))
  const edges: Edge[] = []

  const pushEdge = (source: string, target: string | undefined, sourceHandle?: string) => {
    if (!target || !stepIds.has(target) || source === target) return
    const handleKey = sourceHandle ?? 'nextId'
    edges.push({
      id: `${source}:${handleKey}->${target}`,
      source,
      sourceHandle,
      target,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: false,
    })
  }

  for (const step of def.steps) {
    switch (step.type) {
      case 'content':
      case 'question_multi':
      case 'height_slider':
      case 'weight_slider':
      case 'analysis_loading':
      case 'prefinal_loading':
      case 'cta_external':
        pushEdge(step.id, step.nextId, 'nextId')
        break
      case 'question_single':
        for (const opt of step.options) pushEdge(step.id, opt.nextId, `option:${opt.id}`)
        break
      case 'video_youtube':
        pushEdge(step.id, step.formNextId, 'formNextId')
        pushEdge(step.id, step.nextId, 'nextId')
        break
      default:
        break
    }
  }

  return edges
}

function StepNode({ data, isConnectable = true }: NodeProps<StepNodeData>) {
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
      <div className="flow-node__summary">{data.headline ?? data.step.headline ?? 'Sin titulo'}</div>
      <div className="flow-node__meta">
        {'options' in data.step ? `Opciones: ${data.step.options.length}` : '1 salida principal'}
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

type NewStepKind = 'content' | 'question_single' | 'question_multi' | 'video_youtube' | 'analysis_loading'

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

function makeStep(kind: NewStepKind, def: FunnelDefinition): FunnelStep {
  const id = pickUniqueStepId(def, kind)
  const first = def.startStepId
  switch (kind) {
    case 'content':
      return { id, type: 'content', headline: 'Nueva pantalla', body: '', nextId: first }
    case 'question_single':
      return {
        id,
        type: 'question_single',
        headline: 'Pregunta',
        body: '',
        options: [
          { id: 'op_a', label: 'Opcion A', nextId: first },
          { id: 'op_b', label: 'Opcion B', nextId: first },
        ],
      }
    case 'question_multi':
      return {
        id,
        type: 'question_multi',
        headline: 'Seleccion multiple',
        body: '',
        options: [
          { id: 'opt_a', label: 'Opcion A' },
          { id: 'opt_b', label: 'Opcion B' },
        ],
        nextId: first,
      }
    case 'video_youtube':
      return {
        id,
        type: 'video_youtube',
        headline: 'Video',
        body: '',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        formCta: { label: 'Continuar', href: '#' },
        nextId: first,
      }
    case 'analysis_loading':
      return {
        id,
        type: 'analysis_loading',
        headline: 'Analizando respuestas...',
        body: '',
        nextId: first,
        phases: [
          { title: 'Procesando datos', weight: 1 },
          { title: 'Preparando resultado', weight: 1 },
        ],
      }
    default:
      return { id, type: 'content', headline: 'Nueva pantalla', body: '', nextId: first }
  }
}

function updateStep(def: FunnelDefinition, stepId: string, updater: (step: FunnelStep) => FunnelStep): FunnelDefinition {
  return { ...def, steps: def.steps.map((s) => (s.id === stepId ? updater(s) : s)) }
}

function BuilderInner() {
  const { slug = 'entrenamiento' } = useParams<{ slug: string }>()
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const [def, setDef] = useState<FunnelDefinition | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node<StepNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [selectedStepIds, setSelectedStepIds] = useState<string[]>([])
  const [past, setPast] = useState<FunnelDefinition[]>([])
  const [future, setFuture] = useState<FunnelDefinition[]>([])
  const [isFullscreen, setIsFullscreen] = useState(false)

  const connectionMadeRef = useRef(false)
  const connectOriginRef = useRef<{ source: string; sourceHandle: string | null } | null>(null)

  const selectedStepId = selectedStepIds.length === 1 ? selectedStepIds[0] : ''
  const selectedStep = useMemo(() => def?.steps.find((s) => s.id === selectedStepId) ?? null, [def, selectedStepId])

  const applyDefChange = useCallback((updater: (prev: FunnelDefinition) => FunnelDefinition) => {
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

  const commitConnection = useCallback((connection: Connection) => {
    const source = connection.source
    const target = connection.target
    if (!source || !target || source === target) return
    applyDefChange((prev) => ({
      ...prev,
      steps: prev.steps.map((step) => (step.id === source ? applyConnection(step, connection.sourceHandle ?? null, target) : step)),
    }))
  }, [applyDefChange])

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
          setEdges(buildEdges(next))
          setSelectedStepIds([])
          setPast([])
          setFuture([])
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
    setEdges(buildEdges(def))
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
        applyDefChange((prevDef) => {
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
  }, [applyDefChange])

  const isValidConnection = useCallback((c: Connection) => {
    if (!c.source || !c.target) return false
    if (c.source === c.target) return false
    return true
  }, [])

  const onSelectionChange = useCallback(({ nodes: sel }: { nodes: Node[] }) => {
    setSelectedStepIds(sel.filter((n) => n.type === 'step').map((n) => n.id))
  }, [])

  const saveDraft = useCallback(() => {
    if (!def) return
    writeFunnelDraft(slug, def)
    setSaving('Guardado.')
  }, [def, slug])

  useEffect(() => {
    if (nodes.length === 0) return
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n.position]))
    writeFunnelNodePositions(slug, byId)
  }, [nodes, slug])

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
    const newId = pickUniqueStepId(def, step.id)
    const copy = structuredClone(step) as FunnelStep
    copy.id = newId
    setNodes((prevNodes) => {
      const refNode = prevNodes.find((n) => n.id === selectedStepIds[0])
      const pos = refNode ? { x: refNode.position.x + 64, y: refNode.position.y + 64 } : { x: 120, y: 120 }
      return [...prevNodes, { id: newId, type: 'step', position: pos, data: { id: newId, type: copy.type, headline: copy.headline, step: copy }, draggable: true }]
    })
    applyDefChange((prev) => ({ ...prev, steps: [...prev.steps, copy] }))
    setSaving('Pantalla duplicada. Muevela y guarda draft.')
  }, [def, selectedStepIds, applyDefChange])

  const createStep = useCallback((kind: NewStepKind) => {
    if (!def) return
    const newStep = makeStep(kind, def)
    applyDefChange((prev) => ({ ...prev, steps: [...prev.steps, newStep] }))
    setNodes((prevNodes) => [...prevNodes, { id: newStep.id, type: 'step', position: { x: 120, y: 120 }, data: { id: newStep.id, type: newStep.type, headline: newStep.headline, step: newStep }, draggable: true }])
    setSelectedStepIds([newStep.id])
    setSaving(`Bloque creado: ${kind}`)
  }, [def, applyDefChange])

  const setStartFromSelection = useCallback(() => {
    if (!def || selectedStepIds.length !== 1) {
      setSaving('Selecciona una sola pantalla para marcar inicio.')
      return
    }
    const stepId = selectedStepIds[0]
    applyDefChange((prev) => ({ ...prev, startStepId: stepId }))
    setSaving(`Inicio actualizado: ${stepId}`)
  }, [def, selectedStepIds, applyDefChange])

  const deleteSelected = useCallback(() => {
    if (!def || selectedStepIds.length !== 1) {
      setSaving('Selecciona una sola pantalla para eliminar.')
      return
    }
    if (def.steps.length <= 1) {
      setSaving('No puedes eliminar la ultima pantalla del funnel.')
      return
    }

    const toDelete = selectedStepIds[0]
    if (!window.confirm(`Vas a eliminar la pantalla "${toDelete}". ¿Continuar?`)) return
    const fallback = def.steps.find((s) => s.id !== toDelete)?.id
    if (!fallback) return

    applyDefChange((prev) => {
      if (!prev) return prev
      const nextSteps = prev.steps.filter((s) => s.id !== toDelete).map((s) => mapTargets(s, toDelete, fallback))
      return {
        ...prev,
        startStepId: prev.startStepId === toDelete ? fallback : prev.startStepId,
        steps: nextSteps,
      }
    })
    setNodes((prev) => prev.filter((n) => n.id !== toDelete).map((n) => ({ ...n, selected: false })))
    setSelectedStepIds([])
    setSaving(`Pantalla eliminada: ${toDelete}`)
  }, [def, selectedStepIds, applyDefChange])

  useEffect(() => {
    if (!def) return
    const timer = window.setTimeout(() => writeFunnelDraft(slug, def), 600)
    return () => window.clearTimeout(timer)
  }, [def, slug])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === workspaceRef.current)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!workspaceRef.current) return
    try {
      if (document.fullscreenElement === workspaceRef.current) {
        await document.exitFullscreen()
      } else {
        await workspaceRef.current.requestFullscreen()
      }
    } catch {
      setSaving('No se pudo cambiar a pantalla completa en este navegador.')
    }
  }, [])

  if (err) {
    return (
      <section className="admin-page">
        <header className="admin-page__header">
          <h1>Constructor de arbol</h1>
        </header>
        <article className="admin-card admin-card--empty">{err}</article>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <header className="admin-page__header">
        <h1>Constructor de arbol: {slug}</h1>
        <div className="admin-card__actions">
          <button type="button" className="admin-btn admin-btn--ghost" onClick={undo} disabled={past.length === 0}>
            Deshacer
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={redo} disabled={future.length === 0}>
            Rehacer
          </button>
          <button type="button" className="admin-btn admin-btn--primary" onClick={saveDraft}>Guardar</button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={setStartFromSelection}
            disabled={selectedStepIds.length !== 1}
          >
            Marcar inicio
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={deleteSelected}
            disabled={selectedStepIds.length !== 1 || (def?.steps.length ?? 0) <= 1}
          >
            Eliminar pantalla
          </button>
          <button
            type="button"
            className="admin-btn admin-btn--ghost"
            onClick={duplicateSelected}
            disabled={selectedStepIds.length !== 1}
          >
            Duplicar pantalla
          </button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={toggleFullscreen}>
            {isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
          </button>
        </div>
      </header>
      <FunnelWorkspaceTabs slug={slug} />
      {saving ? <p className="admin-flow__notice">{saving}</p> : null}
      <div
        ref={workspaceRef}
        className={'admin-editor-pro admin-editor-pro--builder' + (isFullscreen ? ' admin-editor-pro--fullscreen' : '')}
      >
        <aside className="admin-card admin-editor-pro__left">
          <h2>Bloques</h2>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => createStep('content')}>Contenido</button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => createStep('question_single')}>Pregunta simple</button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => createStep('question_multi')}>Pregunta multiple</button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => createStep('video_youtube')}>Video</button>
          <button type="button" className="admin-btn admin-btn--ghost" onClick={() => createStep('analysis_loading')}>Loading</button>
          <p className="admin-card__meta">Inicio actual: <strong>{def?.startStepId ?? '-'}</strong></p>
        </aside>
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
            panOnDrag={[2]}
            onPaneContextMenu={(e) => e.preventDefault()}
            defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
          >
            <Background gap={20} size={1} />
            <Controls />
          </ReactFlow>
        </div>
        <aside className="admin-card admin-editor-pro__right">
          <h2>Propiedades</h2>
          {!selectedStep ? <p className="admin-card__meta">Selecciona un nodo para editar.</p> : (
            <>
              <p className="admin-card__meta">{selectedStep.id} · {selectedStep.type}</p>
              <label className="admin-field">
                <span>Headline</span>
                <input value={selectedStep.headline ?? ''} onChange={(e) => applyDefChange((prev) => updateStep(prev, selectedStep.id, (s) => ({ ...s, headline: e.target.value || undefined })))} />
              </label>
              <label className="admin-field">
                <span>Body</span>
                <textarea rows={3} value={selectedStep.body ?? ''} onChange={(e) => applyDefChange((prev) => updateStep(prev, selectedStep.id, (s) => ({ ...s, body: e.target.value || undefined })))} />
              </label>
              {'nextId' in selectedStep ? (
                <label className="admin-field">
                  <span>Siguiente</span>
                  <select value={selectedStep.nextId ?? ''} onChange={(e) => applyDefChange((prev) => updateStep(prev, selectedStep.id, (s) => ({ ...s, nextId: e.target.value })))}>
                    {def?.steps.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>
                </label>
              ) : null}
              {selectedStep.type === 'question_single' ? (
                <div className="admin-field">
                  <span>Opciones y destino</span>
                  {selectedStep.options.map((o) => (
                    <div key={o.id} className="admin-editor__option-row">
                      <input value={o.label} onChange={(e) => applyDefChange((prev) => updateStep(prev, selectedStep.id, (s) => s.type === 'question_single' ? { ...s, options: s.options.map((x) => x.id === o.id ? { ...x, label: e.target.value } : x) } : s))} />
                      <select value={o.nextId} onChange={(e) => applyDefChange((prev) => updateStep(prev, selectedStep.id, (s) => s.type === 'question_single' ? { ...s, options: s.options.map((x) => x.id === o.id ? { ...x, nextId: e.target.value } : x) } : s))}>
                        {def?.steps.map((s) => <option key={s.id} value={s.id}>{s.id}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </aside>
      </div>
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
