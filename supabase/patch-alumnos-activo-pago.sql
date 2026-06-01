-- Opcional: alumnos que ya pagaron (tienen entitlement) pero quedaron activo=false.
-- Ejecutar una vez en Supabase → SQL Editor si ves "Pendiente" en /control/alumnos.

update public.alumnos a
set activo = true
from public.entitlements e
where lower(trim(a.email)) = lower(trim(e.email))
  and a.activo = false;
