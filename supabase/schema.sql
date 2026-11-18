-- Run this once in Supabase: SQL Editor > New query > paste > Run
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  ref               text unique not null,          -- e.g. AEG-1A2B3C4D
  username          text not null,                 -- in-game username
  email             text not null,
  package_id        text not null,
  game_cash         integer not null,
  usdt              numeric(10,2) not null,
  php_amount        numeric(12,2) not null,
  usd_php_rate      numeric(10,4) not null,
  hitpay_request_id text unique,
  status            text not null default 'pending'
                    check (status in ('pending','paid','delivered','failed')),
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  delivered_at      timestamptz                    -- set when you give the coins in-game
);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

-- Lock the table: browsers (anon key) get no access. Only our server's secret key can read/write.
alter table public.orders enable row level security;

-- Player accounts (registration form -> api/register.js)
create table if not exists public.accounts (
  id            uuid primary key default gen_random_uuid(),
  username      text not null check (username ~ '^[A-Za-z0-9_]{4,20}$'),
  email         text not null,
  password_hash text not null,                     -- salted scrypt hash, never plain text
  created_at    timestamptz not null default now()
);
create unique index if not exists accounts_username_uq on public.accounts (lower(username));
create unique index if not exists accounts_email_uq    on public.accounts (lower(email));
alter table public.accounts enable row level security;  -- browsers get no access; only the server key can write
