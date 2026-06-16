-- Suscripción mensual post-trial (30 días desde la compra del programa).
-- Ejecutar en Supabase SQL Editor después de patch-coach-push.sql.
--
-- coach_subscription_status:
--   null         → trial activo (dentro de los 30 días post-compra)
--   'active'     → tiene suscripción Polar activa; coach sigue enviando
--   'canceled'   → suscripción cancelada / expiró el trial sin pagar
--
-- trial_notified_at:
--   se setea cuando el cron envía la push/email de "tu trial vence"
--   para no enviar la notificación más de una vez.

alter table public.alumno_coach_profile
  add column if not exists coach_subscription_status text,
  add column if not exists trial_notified_at timestamptz;

alter table public.alumno_coach_profile
  drop constraint if exists alumno_coach_profile_sub_status_check;

alter table public.alumno_coach_profile
  add constraint alumno_coach_profile_sub_status_check check (
    coach_subscription_status is null
    or coach_subscription_status in ('active', 'canceled')
  );

-- Índice para el cron que busca trials expirados sin suscripción
create index if not exists alumno_coach_profile_sub_status
  on public.alumno_coach_profile (coach_subscription_status)
  where coach_subscription_status is null and coach_active = true;
