-- M1 Lomba: competitions an account saved, skipped, or committed to as an active Slot (blueprint 11, 16; K-03, K-23).
-- The active-Slot limit is enforced here, not only in the UI. It only rejects a row BECOMING a Slot:
-- Slots above the limit (after a downgrade) are kept and stay editable; the user chooses which stay active.

create table public.user_competitions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  competition_key text not null check (competition_key ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$'),
  source text not null default 'catalog' check (source in ('catalog', 'manual', 'search')),
  state text not null check (state in ('saved', 'skipped', 'slot', 'released')),
  card jsonb check (card is null or (jsonb_typeof(card) = 'object' and pg_column_size(card) <= 16384)),
  roadmap jsonb check (roadmap is null or (jsonb_typeof(roadmap) = 'object' and pg_column_size(roadmap) <= 65536)),
  committed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, competition_key)
);
create index user_competitions_slot_idx on public.user_competitions (user_id) where state = 'slot';

alter table public.user_competitions enable row level security;
revoke all on public.user_competitions from public, anon, authenticated, service_role;
grant select, delete on public.user_competitions to authenticated;
grant insert (competition_key, source, state, card, roadmap) on public.user_competitions to authenticated;
grant update (source, state, card, roadmap) on public.user_competitions to authenticated;
grant select, insert, update, delete on public.user_competitions to service_role;

create policy user_competitions_read_own on public.user_competitions for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));
create policy user_competitions_insert_own on public.user_competitions for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.account_session_active()));
create policy user_competitions_update_own on public.user_competitions for update to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()))
  with check (user_id = (select auth.uid()) and (select public.account_session_active()));
create policy user_competitions_delete_own on public.user_competitions for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));

create function public.enforce_active_slot_limit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  slot_limit integer;
begin
  new.updated_at := clock_timestamp();
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.competition_key := old.competition_key;
    new.created_at := old.created_at;
  end if;
  if new.state <> 'slot' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.state = 'slot' then
    new.committed_at := old.committed_at;
    return new;
  end if;

  -- Serialize per account so two concurrent requests cannot both pass the count.
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 5));
  select f."limit" into slot_limit from public.plan_features f
    where f.feature = 'activeSlots' and f.plan = case when exists (
      select 1 from public.entitlements e
      where e.user_id = new.user_id and e.status = 'active'
        and e.starts_at <= clock_timestamp() and clock_timestamp() < e.ends_at
    ) then 'pro' else 'free' end;
  if slot_limit is null then
    raise exception 'slot_limit_unknown' using errcode = 'P0001';
  end if;
  if (select count(*) from public.user_competitions c where c.user_id = new.user_id and c.state = 'slot') >= slot_limit then
    raise exception 'slot_limit_reached' using errcode = 'P0001', detail = slot_limit::text;
  end if;
  new.committed_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.enforce_active_slot_limit() from public, anon, authenticated, service_role;

create trigger ata_enforce_active_slot_limit
  before insert or update on public.user_competitions
  for each row execute function public.enforce_active_slot_limit();

-- Account export stays complete: same function as 0003 plus the new table.
create or replace function public.export_account_data()
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  at_time timestamptz;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(account_id::text, 2));
  at_time := clock_timestamp();
  if (select count(*) from public.audit_log
      where actor_id = account_id and action = 'account_export' and at > at_time - interval '1 hour') >= 3 then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  insert into public.audit_log (actor_id, action, target_type, at)
    values (account_id, 'account_export', 'account', at_time);

  return jsonb_build_object(
    'exported_at', at_time,
    'profile', (select to_jsonb(p) from public.profiles p where p.user_id = account_id),
    'ai_permissions', (select to_jsonb(p) from public.ai_permissions p where p.user_id = account_id),
    'consents', coalesce((select jsonb_agg(to_jsonb(c) - 'guardian_contact_hash' order by accepted_at)
      from public.consents c where c.user_id = account_id), '[]'::jsonb),
    'entitlements', coalesce((select jsonb_agg(to_jsonb(e) - 'created_by' - 'reason' - 'source_ref' order by created_at)
      from public.entitlements e where e.user_id = account_id), '[]'::jsonb),
    'redemptions', coalesce((select jsonb_agg(to_jsonb(r) - 'code_id' order by created_at)
      from public.redemptions r where r.user_id = account_id), '[]'::jsonb),
    'user_competitions', coalesce((select jsonb_agg(to_jsonb(u) order by created_at)
      from public.user_competitions u where u.user_id = account_id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_account_data() from public, anon, authenticated, service_role;
grant execute on function public.export_account_data() to authenticated;
