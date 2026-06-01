-- Ejecutar en Supabase → SQL Editor (una vez).
-- Permite que el alumno marque su propia fila como activa al crear contraseña.

drop policy if exists "alumnos_update_own_activate" on public.alumnos;

create policy "alumnos_update_own_activate"
  on public.alumnos
  for update
  to authenticated
  using (
    lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  )
  with check (
    lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
    and user_id = auth.uid()
    and activo = true
  );
