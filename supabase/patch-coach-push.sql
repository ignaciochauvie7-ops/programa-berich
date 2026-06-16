-- Notificaciones push web (reemplaza WhatsApp coach).
-- Ejecutar en Supabase SQL Editor.

alter table public.alumno_coach_profile
  add column if not exists push_subscription jsonb;

create index if not exists alumno_coach_profile_push_active
  on public.alumno_coach_profile (coach_active)
  where coach_active = true and push_subscription is not null;
