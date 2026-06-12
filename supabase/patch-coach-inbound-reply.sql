-- Permite job inbound_reply para respuestas diferidas (~15 min) en coach_scheduled_sends.
-- Ejecutar en Supabase SQL Editor si el cron ya estaba desplegado.

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
    'reengagement',
    'inbound_reply'
  )
);
