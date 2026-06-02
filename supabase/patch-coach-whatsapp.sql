-- Acompañamiento personalizado por WhatsApp (ejecutar una vez en Supabase SQL Editor).
-- Solo accesible desde service role (API Vercel); sin políticas RLS para authenticated.

create table if not exists public.alumno_coach_profile (
  alumno_id uuid primary key references public.alumnos(id) on delete cascade,
  phone_e164 text not null unique,
  timezone text not null default 'America/Montevideo',
  training_days smallint[] not null default '{}',
  preferred_hour time not null default '08:00',
  goal text not null,
  opt_in_at timestamptz not null,
  setup_completed_at timestamptz not null default now(),
  coach_active boolean not null default true,
  last_inbound_at timestamptz,
  last_outbound_at timestamptz,
  last_user_reply_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint alumno_coach_profile_goal_check check (
    goal in ('Ganar músculo', 'Perder grasa', 'Recomposición corporal')
  ),
  constraint alumno_coach_profile_training_days_check check (
    cardinality(training_days) >= 1
    and training_days <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
  )
);

create index if not exists alumno_coach_profile_active on public.alumno_coach_profile (coach_active)
  where coach_active = true;

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  direction text not null,
  message_type text not null default 'text',
  template_name text,
  body text not null,
  wa_message_id text unique,
  status text not null default 'received',
  created_at timestamptz not null default now(),
  constraint coach_messages_direction_check check (direction in ('inbound', 'outbound')),
  constraint coach_messages_type_check check (
    message_type in ('text', 'template', 'proactive', 'reply')
  )
);

create index if not exists coach_messages_alumno_created on public.coach_messages (alumno_id, created_at desc);

create table if not exists public.coach_scheduled_sends (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos(id) on delete cascade,
  job_type text not null,
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  skipped_reason text,
  created_at timestamptz not null default now(),
  unique (alumno_id, job_type, scheduled_for),
  constraint coach_scheduled_sends_job_check check (
    job_type in (
      'training_reminder',
      'hydration',
      'nutrition',
      'weekly_check',
      'reengagement'
    )
  )
);

create index if not exists coach_scheduled_sends_pending on public.coach_scheduled_sends (scheduled_for)
  where sent_at is null;

alter table public.alumno_coach_profile enable row level security;
alter table public.coach_messages enable row level security;
alter table public.coach_scheduled_sends enable row level security;

-- Sin policies = solo service role puede leer/escribir.
