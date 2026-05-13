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

-- ─── Programa de Afiliados ───────────────────────────────────────────────────

create table if not exists public.affiliates (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  code       text unique,  -- código personalizado, null hasta que el afiliado lo elija
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists affiliates_email_lower on public.affiliates (lower(trim(email)));
create index if not exists affiliates_code_lower  on public.affiliates (lower(trim(code)));

create table if not exists public.affiliate_sales (
  id              uuid primary key default gen_random_uuid(),
  affiliate_id    uuid not null references public.affiliates(id) on delete cascade,
  buyer_email     text not null,
  sale_amount_usd numeric(10,2) not null default 49,
  commission_usd  numeric(10,2) not null,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists affiliate_sales_affiliate_id on public.affiliate_sales (affiliate_id);
create index if not exists affiliate_sales_created_at   on public.affiliate_sales (created_at);

alter table public.affiliates      enable row level security;
alter table public.affiliate_sales enable row level security;

-- Afiliado puede ver su propio registro
create policy "affiliates_select_own"
  on public.affiliates for select to authenticated
  using (
    lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
  );

-- Afiliado puede ver sus propias ventas
create policy "affiliate_sales_select_own"
  on public.affiliate_sales for select to authenticated
  using (
    affiliate_id in (
      select id from public.affiliates
      where lower(trim(email)) = lower(trim(coalesce((auth.jwt() ->> 'email')::text, '')))
    )
  );
