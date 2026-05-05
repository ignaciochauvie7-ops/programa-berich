-- Ejecutar en Supabase → SQL Editor (una vez por proyecto).
-- Ajustá políticas si usás dominios de email custom.

create extension if not exists "pgcrypto";

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_slug text not null,
  source text default 'shopify',
  created_at timestamptz not null default now(),
  unique (email, product_slug)
);

create table if not exists public.invite_tokens (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  email text not null,
  product_slug text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists entitlements_email_lower on public.entitlements (lower(trim(email)));
create index if not exists invite_tokens_hash on public.invite_tokens (token_hash);

alter table public.entitlements enable row level security;
alter table public.invite_tokens enable row level security;

-- Alumnos: solo leen filas donde el mail coincide con el JWT de Supabase Auth.
create policy "entitlements_select_own_email"
  on public.entitlements
  for select
  to authenticated
  using (
    lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  );

-- Nadie desde el cliente toca invitaciones (solo service role en Vercel).
