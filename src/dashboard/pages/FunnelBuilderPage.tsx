import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type Edge,
  type Node,
  type NodeChange,
  type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import type { FunnelDefinition, FunnelStep } from '../../funnel/types'
import { BodyText } from '../../funnel/BodyText'
import { StepRenderer } from '../../funnel/StepRenderer'
import { loadFunnelBySlug } from '../../funnel/loadFunnel'
import { clearFunnelDraft, readFunnelNodePositions, writeFunnelDraft, writeFunnelNodePositions } from '../funnelDraft'
import { FunnelWorkspaceTabs } from './FunnelWorkspaceTabs'

type OutPort = {
  key: string
  label: string
  targetId: string
}

type StepNodeData = {
  id: string
  type: FunnelStep['type']
  headline?: string
  step: FunnelStep
  outputs: OutPort[]
}

function buildGraph(
  def: FunnelDefinition,
  positionById?: Map<string, { x: number; y: number }>,
): { nodes: Node<StepNodeData>[]; edges: Edge[] } {
  const stepById = new Map(def.steps.map((s) => [s.id, s]))
  const nodes: Node<StepNodeData>[] = def.steps.map((step, i) => ({
    id: step.id,
    type: 'step',
    position: positionById?.get(step.id) ?? { x: (i % 3) * 470, y: Math.floor(i / 3) * 470 },
    data: {
      id: step.id,
      type: step.type,
      headline: step.headline,
      step,
      outputs: buildOutPorts(step),
    },
    draggable: true,
  }))
  const edges: Edge[] = []
  for (const step of def.steps) {
    for (const out of buildOutPorts(step)) {
      if (!stepById.has(out.targetId)) continue
      edges.push({
        id: `${step.id}:${out.key}->${out.targetId}`,
        source: step.id,
        sourceHandle: out.key,
        target: out.targetId,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: false,
      })
    }
  }
  return { nodes, edges }
}

function buildOutPorts(step: FunnelStep): OutPort[] {
  switch (step.type) {
    case 'content':
    case 'question_multi':
    case 'height_slider':
    case 'weight_slider':
    case 'analysis_loading':
    case 'prefinal_loading':
      return [{ key: 'nextId', label: 'Siguiente', targetId: step.nextId }]
    case 'question_single':
      return step.options.map((o) => ({ key: `option:${o.id}`, label: o.label, targetId: o.nextId }))
    case 'video_youtube': {
      const out: OutPort[] = []
      if (step.formNextId) out.push({ key: 'formNextId', label: 'CTA formulario', targetId: step.formNextId })
      if (step.nextId) out.push({ key: 'nextId', label: 'Continuar', targetId: step.nextId })
      return out
    }
    case 'cta_external':
      return step.nextId ? [{ key: 'nextId', label: 'Continuar', targetId: step.nextId }] : []
    default:
      return []
  }
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

function StepNode({ data }: NodeProps<StepNodeData>) {
  const branch = inferBranch(data.id)
  const branchAttr = branch ? ({ 'data-branch': branch } as const) : {}

  return (
    <div className="flow-node">
      <Handle type="target" position={Position.Left} />
      <div className="flow-node__id">{data.id}</div>
      <div className="flow-node__type">{data.type}</div>
      <div className="flow-node__preview funnel-root" {...branchAttr}>
        <div className="funnel-shell">
          <div className="funnel-card">
            <MiniStepPreview step={data.step} />
          </div>
        </div>
      </div>
      <div className="flow-node__ports">
        {data.outputs.map((out, i) => (
          <div key={out.key} className="flow-node__port">
            <span>{out.label}</span>
            <Handle id={out.key} type="source" position={Position.Right} style={{ top: 94 + i * 24 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

const nodeTypes = { step: StepNode }

function BuilderInner() {
  const { slug = 'entrenamiento' } = useParams<{ slug: string }>()
  const [def, setDef] = useState<FunnelDefinition | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [nodes, setNodes] = useState<Node<StepNodeData>[]>([])
  const [edges, setEdges] = useState<Edge[]>([])

  useEffect(() => {
    let cancelled = false
    loadFunnelBySlug(slug)
      .then((next) => {
        if (!cancelled) {
          const savedPos = readFunnelNodePositions(slug)
          const graph = buildGraph(next, new Map(Object.entries(savedPos)))
          setDef(next)
          setNodes(graph.nodes)
          setEdges(graph.edges)
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

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev))
  }, [])

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((prev) => applyEdgeChanges(changes, prev))
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      const source = connection.source
      const target = connection.target
      if (!def || !source || !target) return
      const nextDef = {
        ...def,
        steps: def.steps.map((step) =>
          step.id === source ? applyConnection(step, connection.sourceHandle ?? null, target) : step,
        ),
      }
      const pos = new Map(nodes.map((n) => [n.id, n.position]))
      const graph = buildGraph(nextDef, pos)
      setDef(nextDef)
      setNodes(graph.nodes)
      setEdges(graph.edges)
    },
    [def, nodes],
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
      <p className="admin-page__subtitle">
        Conecta pantallas arrastrando flechas entre nodos. Al guardar draft, la ruta /f/{slug} usa este flujo.
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
          nodesDraggable
          elementsSelectable
          minZoom={0.05}
          maxZoom={1.8}
          fitView
          defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed } }}
        >
          <Background gap={20} size={1} />
          <Controls />
        </ReactFlow>
      </div>
      <section className="admin-card">
        <h2 className="admin-flow__legend-title">Leyenda rapida</h2>
        <ul className="admin-flow__legend">
          <li>Las salidas de cada nodo aparecen a la derecha.</li>
          <li>Si un paso tiene varias opciones, cada opción tiene su propia salida.</li>
          <li>El funnel público lee automáticamente tu draft local cuando existe.</li>
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
