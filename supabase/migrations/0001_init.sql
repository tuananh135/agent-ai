-- Migration initiale — Agent IA immobilier (démo)
-- À exécuter dans Supabase → SQL Editor → New query → Run.
-- Le serveur accède aux tables avec la clé service_role (qui contourne RLS).
-- RLS est activé sans policy: rien n'est lisible publiquement même si la clé anon fuit.

create extension if not exists pgcrypto;

create table if not exists properties (
  id          uuid primary key default gen_random_uuid(),
  title       text   not null,
  type        text   not null,
  price       bigint not null,
  area        text   not null,
  rooms       int    not null,
  surface     int    not null,
  description text   not null
);

create table if not exists qualification_criteria (
  id                  text primary key,           -- toujours 'crit' (ligne unique)
  natural_text        text   not null,
  min_budget          bigint,
  financing_required  text[],
  areas               text[],
  property_types      text[],
  max_timeline_months int,
  active              boolean not null default true,
  updated_at          bigint  not null
);

create table if not exists leads (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  phone       text,
  source      text   not null default 'form',
  property_id uuid references properties(id) on delete set null,
  status      text   not null default 'new',
  criteria    jsonb  not null default '{}'::jsonb,
  evaluation  jsonb,
  created_at  bigint not null
);

create table if not exists messages (
  id      uuid primary key default gen_random_uuid(),
  lead_id uuid not null references leads(id) on delete cascade,
  sender  text not null,                            -- client | ai | broker
  text    text not null,
  at      bigint not null
);
create index if not exists messages_lead_idx on messages(lead_id);

create table if not exists slots (
  id       uuid primary key default gen_random_uuid(),
  start_ms bigint  not null,
  end_ms   bigint  not null,
  booked   boolean not null default false
);

create table if not exists appointments (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  slot_id     uuid not null references slots(id),
  property_id uuid references properties(id),
  status      text not null default 'confirmed',
  at          bigint not null
);

create table if not exists reports (
  id      uuid primary key default gen_random_uuid(),
  type    text not null,                            -- booked | rejected | escalation | shortlist | query
  lead_id uuid references leads(id) on delete cascade,
  content text not null,
  at      bigint not null
);

create table if not exists escalations (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  reason      text not null,
  draft_reply text not null,
  status      text not null default 'pending',      -- pending | sent
  at          bigint not null
);

-- Sécurité: RLS activé, aucune policy => accès refusé à anon/auth.
-- La clé service_role utilisée côté serveur contourne RLS et garde l'accès complet.
alter table properties             enable row level security;
alter table qualification_criteria enable row level security;
alter table leads                  enable row level security;
alter table messages               enable row level security;
alter table slots                  enable row level security;
alter table appointments           enable row level security;
alter table reports                enable row level security;
alter table escalations            enable row level security;
