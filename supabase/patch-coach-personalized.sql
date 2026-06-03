-- Personalización coach: datos del quiz (solo compradores) + metas calculadas.
-- Ejecutar en Supabase SQL Editor después de patch-coach-whatsapp.sql.

create table if not exists public.alumno_quiz_profile (
  alumno_id uuid primary key references public.alumnos(id) on delete cascade,
  quiz_variant text not null,
  sex text not null,
  age_range text not null,
  height_cm numeric(5, 1) not null,
  weight_kg numeric(5, 1) not null,
  peso_ideal_kg numeric(5, 1),
  goal text not null,
  impediment text not null,
  impediment_path text not null,
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint alumno_quiz_profile_sex_check check (sex in ('hombre', 'mujer')),
  constraint alumno_quiz_profile_goal_check check (
    goal in ('Ganar músculo', 'Perder grasa', 'Recomposición corporal')
  ),
  constraint alumno_quiz_profile_path_check check (impediment_path in ('musculo', 'grasa-recomp'))
);

alter table public.alumno_coach_profile
  add column if not exists activity_level text,
  add column if not exists maintenance_kcal integer,
  add column if not exists calorie_target integer,
  add column if not exists calorie_cap integer,
  add column if not exists water_ml_base integer,
  add column if not exists water_ml_training_extra integer default 1000,
  add column if not exists steps_target integer default 3000;

alter table public.alumno_coach_profile drop constraint if exists alumno_coach_profile_activity_check;
alter table public.alumno_coach_profile add constraint alumno_coach_profile_activity_check check (
  activity_level is null
  or activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
);

alter table public.coach_scheduled_sends drop constraint if exists coach_scheduled_sends_job_check;
alter table public.coach_scheduled_sends add constraint coach_scheduled_sends_job_check check (
  job_type in (
    'training_reminder',
    'hydration',
    'nutrition',
    'nutrition_am',
    'nutrition_pm',
    'steps_reminder',
    'weekend_boost',
    'impediment_support',
    'weekly_check',
    'reengagement'
  )
);

alter table public.alumno_quiz_profile enable row level security;
