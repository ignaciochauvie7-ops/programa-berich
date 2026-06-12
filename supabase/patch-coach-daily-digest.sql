-- Digest diario consolidado (1 mensaje/día, 4–6/semana) + límites de costo.
-- Ejecutar en Supabase SQL Editor.

alter table public.coach_scheduled_sends drop constraint if exists coach_scheduled_sends_job_check;
alter table public.coach_scheduled_sends add constraint coach_scheduled_sends_job_check check (
  job_type in (
    'daily_digest',
    'inbound_reply',
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
