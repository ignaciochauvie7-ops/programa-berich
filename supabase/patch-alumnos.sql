-- Ejecutar en Supabase → SQL Editor si la tabla `alumnos` no existe todavía.
-- Seguro de correr más de una vez (usa IF NOT EXISTS / DROP POLICY IF EXISTS).

create table if not exists public.alumnos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null unique,
  nombre text,
  created_at timestamptz not null default now(),
  activo boolean not null default false
);

create index if not exists alumnos_user_id on public.alumnos (user_id);
create index if not exists alumnos_email_lower on public.alumnos (lower(trim(email)));

alter table public.alumnos enable row level security;

drop policy if exists "alumnos_select_own" on public.alumnos;

create policy "alumnos_select_own"
  on public.alumnos
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  );
