-- R0.1 account foundation. Supabase Auth owns user identities and sessions.
-- New hosted projects require explicit grants for the system_flags Data API.
revoke all on public.system_flags from public, anon, authenticated, service_role;
grant select on public.system_flags to authenticated;
grant select, insert, update, delete on public.system_flags to service_role;

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  birth_year smallint,
  jenjang text,
  institution text,
  major text,
  grade_or_semester text,
  province text,
  timezone text,
  interests text[] not null default '{}',
  goals_text text,
  weekly_hours integer check (weekly_hours >= 0),
  english_level text,
  fee_max_idr integer check (fee_max_idr >= 0),
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plan_features (
  plan text not null check (plan in ('free', 'pro')),
  feature text not null,
  enabled boolean not null,
  "limit" integer check ("limit" >= 0),
  period text check (period = 'month'),
  depth text,
  status text not null check (status in ('final', 'proposed')),
  note text,
  config_version integer not null check (config_version > 0),
  primary key (plan, feature)
);

-- Snapshot of PLAN_FEATURES at CONFIG_VERSION 1. The PGlite test checks exact parity.
insert into public.plan_features (plan, feature, enabled, "limit", period, status, note, config_version)
values
  ('free', 'activeSlots', true, 3, null, 'proposed', 'PO recommends 1; final after K-23 approval', 1),
  ('free', 'manualCompetitions', true, 10, null, 'proposed', null, 1),
  ('free', 'handoffPacks', true, 15, 'month', 'proposed', null, 1),
  ('free', 'fileValidations', true, 3, 'month', 'proposed', null, 1),
  ('free', 'savedPrompts', true, 10, null, 'proposed', null, 1),
  ('free', 'juryPacks', true, 5, 'month', 'proposed', null, 1),
  ('free', 'juryPersonas', true, 1, null, 'proposed', null, 1),
  ('free', 'juryHistoryVersions', true, 3, null, 'proposed', null, 1),
  ('free', 'portfolioItems', true, 10, null, 'proposed', null, 1),
  ('free', 'parentReports', true, 1, 'month', 'proposed', null, 1),
  ('free', 'analyticsWindowDays', true, 28, null, 'proposed', null, 1),
  ('free', 'fullPersonalContext', false, null, null, 'proposed', null, 1),
  ('free', 'adaptiveRoadmap', false, null, null, 'proposed', null, 1),
  ('free', 'multistepWorkflows', false, null, null, 'proposed', null, 1),
  ('free', 'panelJury', false, null, null, 'proposed', null, 1),
  ('free', 'redTeamJury', false, null, null, 'proposed', null, 1),
  ('free', 'officialRubrics', false, null, null, 'proposed', null, 1),
  ('free', 'multiConnectionWorkflows', false, null, null, 'proposed', null, 1),
  ('free', 'sourceMonitoring', false, null, null, 'proposed', null, 1),
  ('free', 'evaluationReportPdf', false, null, null, 'proposed', null, 1),
  ('pro', 'activeSlots', true, 3, null, 'final', 'K-03', 1),
  ('pro', 'manualCompetitions', true, null, null, 'proposed', null, 1),
  ('pro', 'handoffPacks', true, null, null, 'proposed', null, 1),
  ('pro', 'fileValidations', true, 50, 'month', 'proposed', 'calibrate from real compute cost', 1),
  ('pro', 'savedPrompts', true, null, null, 'proposed', null, 1),
  ('pro', 'juryPacks', true, null, null, 'proposed', null, 1),
  ('pro', 'juryPersonas', true, null, null, 'proposed', null, 1),
  ('pro', 'juryHistoryVersions', true, null, null, 'proposed', null, 1),
  ('pro', 'portfolioItems', true, null, null, 'proposed', null, 1),
  ('pro', 'parentReports', true, null, null, 'proposed', null, 1),
  ('pro', 'analyticsWindowDays', true, null, null, 'proposed', null, 1),
  ('pro', 'fullPersonalContext', true, null, null, 'proposed', null, 1),
  ('pro', 'adaptiveRoadmap', true, null, null, 'proposed', null, 1),
  ('pro', 'multistepWorkflows', true, null, null, 'proposed', null, 1),
  ('pro', 'panelJury', true, null, null, 'proposed', null, 1),
  ('pro', 'redTeamJury', true, null, null, 'proposed', null, 1),
  ('pro', 'officialRubrics', true, null, null, 'proposed', null, 1),
  ('pro', 'multiConnectionWorkflows', true, null, null, 'proposed', null, 1),
  ('pro', 'sourceMonitoring', true, null, null, 'proposed', null, 1),
  ('pro', 'evaluationReportPdf', true, null, null, 'proposed', null, 1);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null default 'pro' check (plan = 'pro'),
  source text not null check (source in ('payment', 'redeem', 'partner', 'grant')),
  source_ref uuid,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_by uuid references auth.users (id) on delete set null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (id, user_id)
);
create index entitlements_user_idx on public.entitlements (user_id);
create index entitlements_created_by_idx on public.entitlements (created_by);

create table public.redeem_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique check (code_hash ~ '^[0-9a-f]{64}$'),
  label text not null,
  program text not null default 'sobat_ambis',
  max_uses integer not null check (max_uses > 0),
  used integer not null default 0 check (used >= 0 and used <= max_uses),
  valid_until timestamptz,
  days_granted integer not null check (days_granted > 0),
  one_per_user boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_id uuid not null references public.redeem_codes (id),
  entitlement_id uuid not null unique,
  one_per_user boolean not null,
  created_at timestamptz not null default now(),
  foreign key (entitlement_id, user_id) references public.entitlements (id, user_id) on delete cascade
);
create unique index redemptions_once_idx on public.redemptions (code_id, user_id) where one_per_user;
create index redemptions_code_user_idx on public.redemptions (code_id, user_id);
create index redemptions_user_idx on public.redemptions (user_id);

create table public.redeem_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key uuid,
  result jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index redeem_requests_user_at_idx on public.redeem_requests (user_id, created_at);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  actor_type text not null default 'user' check (actor_type in ('user', 'admin', 'system')),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  reason text,
  ip_hash text,
  ua_hash text,
  meta jsonb not null default '{}'
);
create index audit_log_actor_action_at_idx on public.audit_log (actor_id, action, at);

create table public.ai_permissions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  categories jsonb not null default '{
    "profil": false, "akademik": false, "lomba": false, "tugas": false,
    "progres": false, "evaluasi": false, "ingatan": false, "dokumen": false
  }' check (jsonb_typeof(categories) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  doc text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  guardian_name text,
  guardian_contact_hash text,
  unique (user_id, doc, version)
);

alter table public.profiles enable row level security;
alter table public.plan_features enable row level security;
alter table public.entitlements enable row level security;
alter table public.redeem_codes enable row level security;
alter table public.redemptions enable row level security;
alter table public.redeem_requests enable row level security;
alter table public.audit_log enable row level security;
alter table public.ai_permissions enable row level security;
alter table public.consents enable row level security;

revoke all on public.profiles, public.plan_features, public.entitlements, public.redeem_codes,
  public.redemptions, public.redeem_requests, public.audit_log, public.ai_permissions, public.consents
  from public, anon, authenticated, service_role;
grant select on public.plan_features to anon, authenticated;
grant select on public.profiles, public.redemptions, public.ai_permissions to authenticated;
grant select (id, user_id, plan, source, starts_at, ends_at, status, created_at) on public.entitlements to authenticated;
grant select (id, user_id, doc, version, accepted_at, guardian_name) on public.consents to authenticated;
grant select, insert, update, delete on
  public.profiles, public.plan_features, public.entitlements, public.redeem_codes,
  public.redemptions, public.redeem_requests, public.ai_permissions, public.consents to service_role;
grant select, insert on public.audit_log to service_role;

-- GoTrue access tokens can outlive a revoked session. Check the session record for account access.
create function public.account_session_active()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous') = 'false', true)
    and exists (
      select 1 from auth.sessions
      where id = (auth.jwt() ->> 'session_id')::uuid
        and user_id = auth.uid()
        and (not_after is null or not_after > statement_timestamp())
    );
$$;
revoke all on function public.account_session_active() from public, anon, authenticated, service_role;
grant execute on function public.account_session_active() to authenticated;

create policy plan_features_read on public.plan_features for select to anon, authenticated using (true);
create policy profiles_read_own on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));
create policy entitlements_read_own on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));
create policy redemptions_read_own on public.redemptions for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));
create policy ai_permissions_read_own on public.ai_permissions for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));
create policy consents_read_own on public.consents for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));
-- Service role bypasses RLS. Client roles have no policies on code hashes, requests, or the audit log.

create function public.create_account_defaults()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  insert into public.ai_permissions (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.create_account_defaults() from public, anon, authenticated, service_role;

create trigger ata_create_account_defaults
  after insert on auth.users for each row execute function public.create_account_defaults();

insert into public.profiles (user_id) select id from auth.users on conflict do nothing;
insert into public.ai_permissions (user_id) select id from auth.users on conflict do nothing;
