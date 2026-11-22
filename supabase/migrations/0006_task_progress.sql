-- M1 Personal Progress: the status of each Peta Jalan step, per account (blueprint 06 §7, 11, 12 §4; FR-PRG-03).
-- One source of truth for XP, level and streak. The client never sends XP, a completion time or a date:
-- rows are written only by set_task_status(), which stamps the server clock and the account's local date.
-- The roadmap itself stays in user_competitions.roadmap; progress fields in that document are ignored.

create table public.task_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  competition_key text not null,
  step_id text not null check (char_length(step_id) between 1 and 80),
  status text not null check (status in ('todo', 'doing', 'done')),
  due_on date,
  completed_at timestamptz,
  completed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, competition_key, step_id),
  foreign key (user_id, competition_key) references public.user_competitions (user_id, competition_key) on delete cascade,
  check ((status = 'done') = (completed_at is not null)),
  check ((status = 'done') = (completed_on is not null))
);

alter table public.task_progress enable row level security;
revoke all on public.task_progress from public, anon, authenticated, service_role;
grant select on public.task_progress to authenticated;
grant select, insert, update, delete on public.task_progress to service_role;

create policy task_progress_read_own on public.task_progress for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));

-- The account's calendar day: profiles.timezone when it is a zone Postgres knows, Asia/Jakarta otherwise.
create function public.account_timezone(account_id uuid)
returns text
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  zone text;
begin
  select p.timezone into zone from public.profiles p where p.user_id = account_id;
  if zone is null or zone = '' then
    return 'Asia/Jakarta';
  end if;
  begin
    perform pg_catalog.now() at time zone zone;
  exception when others then
    return 'Asia/Jakarta';
  end;
  return zone;
end;
$$;
revoke all on function public.account_timezone(uuid) from public, anon, authenticated, service_role;

create function public.progress_today()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  zone text;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  zone := public.account_timezone(account_id);
  return jsonb_build_object('timezone', zone, 'today', (clock_timestamp() at time zone zone)::date);
end;
$$;
revoke all on function public.progress_today() from public, anon, authenticated, service_role;
grant execute on function public.progress_today() to authenticated;

-- Sets one step's status. Idempotent: the same status again changes nothing and keeps the first completion time.
-- Serialized per account, so repeated or concurrent requests leave exactly one row and one completion.
-- Leaving 'done' clears the completion (its XP and streak day go with it); completing again stamps the new day.
create function public.set_task_status(p_competition_key text, p_step_id text, p_status text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  zone text;
  at_time timestamptz;
  today date;
  plan jsonb;
  step jsonb;
  due date;
  before_row public.task_progress;
  after_row public.task_progress;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  if p_status is null or p_status not in ('todo', 'doing', 'done') then
    return jsonb_build_object('error', 'validation');
  end if;

  perform pg_advisory_xact_lock(hashtextextended(account_id::text, 6));

  select c.roadmap into plan from public.user_competitions c
    where c.user_id = account_id and c.competition_key = p_competition_key and c.state = 'slot';
  if not found or plan is null or jsonb_typeof(plan -> 'langkah') <> 'array' then
    return jsonb_build_object('error', 'not_found');
  end if;
  select s into step from jsonb_array_elements(plan -> 'langkah') s where s ->> 'id' = p_step_id limit 1;
  if step is null then
    return jsonb_build_object('error', 'not_found');
  end if;
  if plan -> 'disetujui' is distinct from 'true'::jsonb then
    return jsonb_build_object('error', 'not_approved');
  end if;

  zone := public.account_timezone(account_id);
  at_time := clock_timestamp();
  today := (at_time at time zone zone)::date;
  if step ->> 'tanggal' ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      due := (step ->> 'tanggal')::date;
    exception when others then
      due := null;
    end;
  end if;

  select * into before_row from public.task_progress t
    where t.user_id = account_id and t.competition_key = p_competition_key and t.step_id = p_step_id;

  if before_row.status is not distinct from p_status or (before_row.status is null and p_status = 'todo') then
    after_row := before_row;
  elsif before_row.status is null then
    insert into public.task_progress (user_id, competition_key, step_id, status, due_on, completed_at, completed_on)
      values (account_id, p_competition_key, p_step_id, p_status,
        case when p_status = 'done' then due end,
        case when p_status = 'done' then at_time end,
        case when p_status = 'done' then today end)
      returning * into after_row;
  else
    update public.task_progress t set
        status = p_status,
        due_on = case when p_status = 'done' then due end,
        completed_at = case when p_status = 'done' then at_time end,
        completed_on = case when p_status = 'done' then today end,
        updated_at = at_time
      where t.user_id = account_id and t.competition_key = p_competition_key and t.step_id = p_step_id
      returning * into after_row;
  end if;

  return jsonb_build_object(
    'changed', after_row is distinct from before_row,
    'timezone', zone,
    'today', today,
    'task', jsonb_build_object(
      'competition_key', p_competition_key,
      'step_id', p_step_id,
      'status', coalesce(after_row.status, 'todo'),
      'due_on', after_row.due_on,
      'completed_at', after_row.completed_at,
      'completed_on', after_row.completed_on
    )
  );
end;
$$;
revoke all on function public.set_task_status(text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.set_task_status(text, text, text) to authenticated;

-- Account export stays complete: same function as 0005 plus the new table.
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
      from public.user_competitions u where u.user_id = account_id), '[]'::jsonb),
    'task_progress', coalesce((select jsonb_agg(to_jsonb(t) order by created_at, competition_key, step_id)
      from public.task_progress t where t.user_id = account_id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_account_data() from public, anon, authenticated, service_role;
grant execute on function public.export_account_data() to authenticated;
