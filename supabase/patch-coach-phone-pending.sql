-- Permite completar el setup sin teléfono; se vincula cuando el alumno escribe por WhatsApp.
-- Ejecutar en Supabase SQL Editor si alumno_coach_profile.phone_e164 es NOT NULL.

alter table public.alumno_coach_profile
  alter column phone_e164 drop not null;
