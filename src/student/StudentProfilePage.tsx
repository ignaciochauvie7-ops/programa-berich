import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../auth/supabaseClient'
import {
  ACTIVITY_OPTIONS,
  AGE_OPTIONS,
  DAY_OPTIONS,
  GOAL_OPTIONS,
  activityLabel,
  dayLabels,
  impedimentOptionsForGoal,
  type ActivityLevel,
  type GoalOption,
} from './coachProfileOptions'
import { PushNotificationsPanel } from './PushNotificationsPanel'
import { UpgradePanel } from './UpgradePanel'

type TrialStatus = 'active' | 'expiring' | 'expired' | 'subscribed'

type QuizData = {
  sex: 'hombre' | 'mujer'
  age_range: string
  height_cm: number
  weight_kg: number
  peso_ideal_kg: number | null
  goal: GoalOption
  impediment: string
  impediment_path: string
}

type CoachData = {
  training_days: number[]
  activity_level: ActivityLevel | null
  push_subscribed: boolean
  calorie_target: number | null
  calorie_cap: number | null
  water_ml_base: number | null
  steps_target: number | null
  status?: TrialStatus
  days_left?: number | null
}

type TargetsData = {
  calorie_target_label: string
  calorie_cap_label: string | null
  water_liters: string | null
  water_training_extra_liters: string | null
  steps_target: number | null
}

type ProfileResponse = {
  has_quiz: boolean
  quiz?: QuizData
  coach?: CoachData | null
  targets?: TargetsData | null
  error?: string
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="student-profile__row">
      <span className="student-profile__label">{label}</span>
      <span className="student-profile__value">{value}</span>
    </div>
  )
}

export function StudentProfilePage() {
  const { session } = useAuth()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [data, setData] = useState<ProfileResponse | null>(null)

  const [sex, setSex] = useState<'hombre' | 'mujer'>('hombre')
  const [ageRange, setAgeRange] = useState<string>(AGE_OPTIONS[1])
  const [heightCm, setHeightCm] = useState(170)
  const [weightKg, setWeightKg] = useState(75)
  const [pesoIdealKg, setPesoIdealKg] = useState('')
  const [goal, setGoal] = useState<GoalOption>('Recomposición corporal')
  const [impediment, setImpediment] = useState('')
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 3, 5])
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')

  const impedimentOptions = useMemo(() => impedimentOptionsForGoal(goal), [goal])

  function applyToForm(quiz: QuizData, coach: CoachData | null | undefined) {
    setSex(quiz.sex)
    setAgeRange(quiz.age_range)
    setHeightCm(quiz.height_cm)
    setWeightKg(quiz.weight_kg)
    setPesoIdealKg(quiz.peso_ideal_kg != null ? String(quiz.peso_ideal_kg) : '')
    setGoal(quiz.goal)
    setImpediment(quiz.impediment)
    if (coach) {
      setTrainingDays(coach.training_days)
      setActivityLevel(coach.activity_level ?? 'moderate')
    }
  }

  async function loadProfile() {
    if (!session?.access_token) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coach/my-profile', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const body = (await res.json()) as ProfileResponse
      if (!res.ok) {
        setError(body.error ?? 'No se pudo cargar tu perfil.')
        setData(null)
        return
      }
      setData(body)
      if (body.quiz) applyToForm(body.quiz, body.coach)
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [session?.access_token])

  useEffect(() => {
    if (!impedimentOptions.includes(impediment)) {
      setImpediment(impedimentOptions[0] ?? '')
    }
  }, [goal, impediment, impedimentOptions])

  function toggleDay(day: number) {
    setTrainingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function cancelEdit() {
    if (data?.quiz) applyToForm(data.quiz, data.coach)
    setEditing(false)
    setError(null)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!session?.access_token || !supabase) return

    if (trainingDays.length < 1) {
      setError('Elegí al menos un día de entrenamiento.')
      return
    }

    setBusy(true)
    setError(null)
    setSaved(false)

    try {
      const res = await fetch('/api/coach/my-profile', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sex,
          age_range: ageRange,
          height_cm: heightCm,
          weight_kg: weightKg,
          peso_ideal_kg: pesoIdealKg.trim() ? Number(pesoIdealKg) : null,
          goal,
          impediment,
          training_days: trainingDays,
          activity_level: activityLevel,
        }),
      })

      const body = (await res.json()) as ProfileResponse & { ok?: boolean; error?: string }
      if (!res.ok) {
        setError(body.error ?? 'No se pudo guardar.')
        return
      }

      setData(body)
      if (body.quiz) applyToForm(body.quiz, body.coach)
      setEditing(false)
      setSaved(true)
    } catch {
      setError('Error de red. Intentá de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="student-profile__status">Cargando tu perfil…</p>
  }

  if (!data?.has_quiz || !data.quiz) {
    return (
      <div className="student-profile">
        <h1>Mi perfil</h1>
        <p className="student-profile__status">No encontramos los datos de tu evaluación inicial.</p>
      </div>
    )
  }

  const { quiz, coach, targets } = data

  return (
    <div className="student-profile">
      <header className="student-profile__header">
        <div>
          <h1>Mi perfil</h1>
          <p className="student-profile__subtitle">
            Estos datos personalizan tus recordatorios push. Si algo cambia, actualizalo acá.
          </p>
        </div>
        {!editing ? (
          <button type="button" className="admin-btn" onClick={() => setEditing(true)}>
            Editar
          </button>
        ) : null}
      </header>

      {saved ? <p className="student-profile__saved">Perfil actualizado. Tus recordatorios usarán estos datos.</p> : null}
      {error ? <div className="student-auth__error student-profile__error">{error}</div> : null}

      {!editing ? (
        <div className="student-profile__sections">
          {coach && session?.access_token && (coach.status === 'expiring' || coach.status === 'expired') ? (
            <UpgradePanel
              accessToken={session.access_token}
              status={coach.status}
              daysLeft={coach.days_left ?? null}
              variant="profile"
            />
          ) : null}

          {coach && session?.access_token ? (
            <PushNotificationsPanel
              accessToken={session.access_token}
              pushSubscribed={coach.push_subscribed}
              variant="profile"
              onSubscribed={() => void loadProfile()}
            />
          ) : null}

          <section className="student-profile__card">
            <h2>Evaluación inicial</h2>
            <FieldRow label="Sexo" value={quiz.sex === 'mujer' ? 'Mujer' : 'Hombre'} />
            <FieldRow label="Edad" value={quiz.age_range} />
            <FieldRow label="Altura" value={`${quiz.height_cm} cm`} />
            <FieldRow label="Peso actual" value={`${quiz.weight_kg} kg`} />
            {quiz.peso_ideal_kg != null ? (
              <FieldRow label="Peso ideal" value={`${quiz.peso_ideal_kg} kg`} />
            ) : null}
            <FieldRow label="Objetivo" value={quiz.goal} />
            <FieldRow label="Principal dificultad" value={quiz.impediment} />
          </section>

          {coach ? (
            <section className="student-profile__card">
              <h2>Entrenamiento</h2>
              <FieldRow label="Días de entreno" value={dayLabels(coach.training_days)} />
              <FieldRow label="Actividad semanal" value={activityLabel(coach.activity_level)} />
            </section>
          ) : null}

          {targets ? (
            <section className="student-profile__card student-profile__card--targets">
              <h2>Metas actuales (coach)</h2>
              <FieldRow label="Calorías objetivo" value={`${targets.calorie_target_label} kcal`} />
              {targets.calorie_cap_label ? (
                <FieldRow label="Tope diario" value={`${targets.calorie_cap_label} kcal`} />
              ) : null}
              {targets.water_liters ? (
                <FieldRow label="Agua base" value={`${targets.water_liters} L`} />
              ) : null}
              {targets.water_training_extra_liters ? (
                <FieldRow label="Agua extra (día de entreno)" value={`+${targets.water_training_extra_liters} L`} />
              ) : null}
              {targets.steps_target ? (
                <FieldRow
                  label="Pasos"
                  value={new Intl.NumberFormat('es-UY').format(targets.steps_target)}
                />
              ) : null}
            </section>
          ) : null}
        </div>
      ) : (
        <form className="student-profile__form" onSubmit={onSubmit}>
          <section className="student-profile__card">
            <h2>Evaluación inicial</h2>
            <div className="student-profile__field">
              <span className="student-profile__label">Sexo</span>
              <div className="coach-setup__options">
                {(['hombre', 'mujer'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={'coach-setup__option' + (sex === opt ? ' coach-setup__option--on' : '')}
                    onClick={() => setSex(opt)}
                    disabled={busy}
                  >
                    {opt === 'mujer' ? 'Mujer' : 'Hombre'}
                  </button>
                ))}
              </div>
            </div>
            <div className="student-profile__field">
              <span className="student-profile__label">Edad</span>
              <select
                className="student-profile__select"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                disabled={busy}
              >
                {AGE_OPTIONS.map((age) => (
                  <option key={age} value={age}>
                    {age}
                  </option>
                ))}
              </select>
            </div>
            <div className="student-profile__grid">
              <label className="student-profile__field">
                <span className="student-profile__label">Altura (cm)</span>
                <input
                  type="number"
                  min={120}
                  max={230}
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  disabled={busy}
                />
              </label>
              <label className="student-profile__field">
                <span className="student-profile__label">Peso actual (kg)</span>
                <input
                  type="number"
                  min={35}
                  max={250}
                  step={0.1}
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  disabled={busy}
                />
              </label>
              <label className="student-profile__field">
                <span className="student-profile__label">Peso ideal (kg, opcional)</span>
                <input
                  type="number"
                  min={35}
                  max={250}
                  step={0.1}
                  value={pesoIdealKg}
                  onChange={(e) => setPesoIdealKg(e.target.value)}
                  disabled={busy}
                  placeholder="Opcional"
                />
              </label>
            </div>
            <div className="student-profile__field">
              <span className="student-profile__label">Objetivo</span>
              <div className="coach-setup__options">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className={'coach-setup__option' + (goal === opt ? ' coach-setup__option--on' : '')}
                    onClick={() => setGoal(opt)}
                    disabled={busy}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            <div className="student-profile__field">
              <span className="student-profile__label">Principal dificultad</span>
              <select
                className="student-profile__select"
                value={impediment}
                onChange={(e) => setImpediment(e.target.value)}
                disabled={busy}
              >
                {impedimentOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </section>

          <section className="student-profile__card">
            <h2>Entrenamiento</h2>
            <div className="student-profile__field">
              <span className="student-profile__label">Días de entreno</span>
              <div className="coach-setup__days">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    className={'coach-setup__chip' + (trainingDays.includes(day.value) ? ' coach-setup__chip--on' : '')}
                    onClick={() => toggleDay(day.value)}
                    disabled={busy}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="student-profile__field">
              <span className="student-profile__label">Actividad física semanal</span>
              <div className="coach-setup__options">
                {ACTIVITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={
                      'coach-setup__option' + (activityLevel === opt.value ? ' coach-setup__option--on' : '')
                    }
                    onClick={() => setActivityLevel(opt.value)}
                    disabled={busy}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="student-profile__actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={cancelEdit} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="admin-btn" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
