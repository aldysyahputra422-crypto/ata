-- 0001: system_flags (PRD 8.4). Global switches such as the Radar kill switch (FR-SCN-14, FR-ADM-06).
-- RLS: authenticated users may read; only the service role writes (it bypasses RLS).

create table if not exists public.system_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.system_flags is 'Global feature switches. Read: authenticated. Write: service role only.';

alter table public.system_flags enable row level security;

drop policy if exists "system_flags_select_authenticated" on public.system_flags;
create policy "system_flags_select_authenticated"
  on public.system_flags
  for select
  to authenticated
  using (true);

-- No insert/update/delete policies on purpose: clients can never write.
revoke insert, update, delete, truncate on public.system_flags from anon, authenticated;
revoke select on public.system_flags from anon;

insert into public.system_flags (key, value)
values
  ('radar_enabled', 'true'::jsonb),
  ('push_enabled', 'true'::jsonb)
on conflict (key) do nothing;
