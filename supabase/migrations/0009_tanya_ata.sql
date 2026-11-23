-- Tanya Ata (FR-BYOK-02, FR-BYOK-10, FR-CCH-01): session-bound BYOK credential, request counter and run provenance.
-- Clients get no table access to credentials or counters. Every write goes through the functions below, which
-- take the account and the session from the JWT, never from an argument.

-- One AI connection per sign-in session (blueprint 16 §3). The row holds ciphertext only: decrypting it also
-- needs the server's KEK and the 32-byte salt kept in the browser's HttpOnly cookie, so a copy of this table
-- (or of its backup) opens nothing. The row dies with the session, and after 2 idle hours or 12 hours at most.
create table public.ai_credentials (
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references auth.sessions (id) on delete cascade,
  connection_id uuid not null default gen_random_uuid(),
  provider_id text not null check (char_length(provider_id) between 1 and 40),
  base_url text check (base_url is null or char_length(base_url) <= 300),
  model text not null check (char_length(model) between 1 and 200),
  last4 text not null check (char_length(last4) <= 4),
  kek_version integer not null check (kek_version > 0),
  iv text not null check (char_length(iv) <= 32),
  ciphertext text not null check (char_length(ciphertext) <= 4096),
  tag text not null check (char_length(tag) <= 64),
  -- The data key, wrapped under the KEK-derived key: base64(iv | wrapped key | tag).
  wrapped_key text not null check (char_length(wrapped_key) <= 128),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  idle_expires_at timestamptz not null,
  absolute_expires_at timestamptz not null,
  primary key (user_id, session_id)
);
alter table public.ai_credentials enable row level security;
revoke all on public.ai_credentials from public, anon, authenticated, service_role;
grant select, delete on public.ai_credentials to service_role;
-- No policy on purpose: no client role can read or write a row, ciphertext included.

create table public.ai_request_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 'request': any AI call, per minute. 'test': connection tests, per 10 minutes.
  kind text not null default 'request' check (kind in ('request', 'test')),
  window_start timestamptz not null,
  count integer not null check (count > 0),
  primary key (user_id, kind, window_start)
);
alter table public.ai_request_counters enable row level security;
revoke all on public.ai_request_counters from public, anon, authenticated, service_role;
grant select, delete on public.ai_request_counters to service_role;

-- What a Tanya Ata run used: intent, provider, which data categories were sent and which were held back.
-- Never the question, the answer, the prompt or the key.
create table public.tanya_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('direct', 'handoff')),
  intent text not null check (char_length(intent) between 1 and 40),
  provider_id text check (provider_id is null or char_length(provider_id) <= 40),
  model text check (model is null or char_length(model) <= 200),
  categories_sent text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array' and pg_column_size(sources) <= 8192),
  blocked jsonb not null default '[]'::jsonb check (jsonb_typeof(blocked) = 'array' and pg_column_size(blocked) <= 2048),
  status text not null default 'started' check (status in ('started', 'done', 'error', 'stopped')),
  error_code text check (error_code is null or char_length(error_code) <= 40),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index tanya_runs_user_created on public.tanya_runs (user_id, created_at desc);
alter table public.tanya_runs enable row level security;
revoke all on public.tanya_runs from public, anon, authenticated, service_role;
grant select on public.tanya_runs to authenticated;
grant select, delete on public.tanya_runs to service_role;
create policy tanya_runs_read_own on public.tanya_runs for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));

create function public.ai_credential_session()
returns uuid
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  return (auth.jwt() ->> 'session_id')::uuid;
end;
$$;
revoke all on function public.ai_credential_session() from public, anon, authenticated, service_role;

-- Real cleanup, not a filter on read: removes every stored key that is past its idle or absolute expiry, or whose
-- login session has ended. Runs on every AI call of any account, and on a schedule where pg_cron is installed.
create function public.ai_credentials_purge()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  removed integer;
begin
  delete from public.ai_credentials c
    where c.absolute_expires_at <= now() or c.idle_expires_at <= now()
      or not exists (select 1 from auth.sessions s where s.id = c.session_id and (s.not_after is null or s.not_after > now()));
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.ai_credentials_purge() from public, anon, authenticated, service_role;
grant execute on function public.ai_credentials_purge() to service_role;

-- The ids a new credential will be bound to. The server derives the encryption key from them before it stores anything.
create function public.ai_credential_begin()
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  session uuid := public.ai_credential_session();
begin
  perform public.ai_credentials_purge();
  return jsonb_build_object('user_id', auth.uid(), 'session_id', session, 'connection_id', gen_random_uuid());
end;
$$;
revoke all on function public.ai_credential_begin() from public, anon, authenticated, service_role;
grant execute on function public.ai_credential_begin() to authenticated;

create function public.ai_credential_put(
  p_connection_id uuid, p_provider_id text, p_base_url text, p_model text, p_last4 text,
  p_kek_version integer, p_iv text, p_ciphertext text, p_tag text, p_wrapped_key text, p_expires_epoch bigint
)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  session uuid := public.ai_credential_session();
  row public.ai_credentials;
  expires timestamptz;
begin
  if p_connection_id is null or p_provider_id is null or p_model is null or p_last4 is null
    or p_kek_version is null or p_iv is null or p_ciphertext is null or p_tag is null or p_wrapped_key is null
    or p_expires_epoch is null then
    return jsonb_build_object('error', 'validation');
  end if;
  -- The expiry is part of what the ciphertext authenticates, so the server chooses it and the row must carry the same value.
  expires := to_timestamp(p_expires_epoch);
  if expires <= now() or expires > now() + interval '12 hours 1 minute' then
    return jsonb_build_object('error', 'validation');
  end if;
  delete from public.ai_credentials where user_id = account_id and session_id = session;
  perform public.ai_credentials_purge();
  insert into public.ai_credentials (user_id, session_id, connection_id, provider_id, base_url, model, last4,
      kek_version, iv, ciphertext, tag, wrapped_key, idle_expires_at, absolute_expires_at)
    values (account_id, session, p_connection_id, p_provider_id, p_base_url, p_model, p_last4,
      p_kek_version, p_iv, p_ciphertext, p_tag, p_wrapped_key, least(now() + interval '2 hours', expires), expires)
    returning * into row;
  insert into public.audit_log (actor_id, action, target_type, meta)
    values (account_id, 'ai_connection_create', 'ai_credentials', jsonb_build_object('provider', p_provider_id));
  return jsonb_build_object('connection_id', row.connection_id, 'provider_id', row.provider_id, 'model', row.model,
    'last4', row.last4, 'expires_at', least(row.idle_expires_at, row.absolute_expires_at));
end;
$$;
revoke all on function public.ai_credential_put(uuid, text, text, text, text, integer, text, text, text, text, bigint) from public, anon, authenticated, service_role;
grant execute on function public.ai_credential_put(uuid, text, text, text, text, integer, text, text, text, text, bigint) to authenticated;

-- p_secret false: what the screen may show. true: also the ciphertext, for the server to decrypt; it extends the idle window.
create function public.ai_credential_get(p_secret boolean default false)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  session uuid := public.ai_credential_session();
  row public.ai_credentials;
  result jsonb;
begin
  perform public.ai_credentials_purge();
  if coalesce(p_secret, false) then
    update public.ai_credentials
      set last_used_at = now(), idle_expires_at = least(now() + interval '2 hours', absolute_expires_at)
      where user_id = account_id and session_id = session returning * into row;
  else
    select * into row from public.ai_credentials where user_id = account_id and session_id = session;
  end if;
  if row.user_id is null then return null; end if;
  result := jsonb_build_object('connection_id', row.connection_id, 'provider_id', row.provider_id, 'base_url', row.base_url,
    'model', row.model, 'last4', row.last4, 'expires_at', least(row.idle_expires_at, row.absolute_expires_at));
  if coalesce(p_secret, false) then
    result := result || jsonb_build_object('user_id', row.user_id, 'session_id', row.session_id,
      'kek_version', row.kek_version, 'iv', row.iv, 'ciphertext', row.ciphertext, 'tag', row.tag,
      'wrapped_key', row.wrapped_key, 'expires_epoch', extract(epoch from row.absolute_expires_at)::bigint);
  end if;
  return result;
end;
$$;
revoke all on function public.ai_credential_get(boolean) from public, anon, authenticated, service_role;
grant execute on function public.ai_credential_get(boolean) to authenticated;

create function public.ai_credential_delete()
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  session uuid := public.ai_credential_session();
  removed integer;
begin
  delete from public.ai_credentials where user_id = account_id and session_id = session;
  get diagnostics removed = row_count;
  if removed > 0 then
    insert into public.audit_log (actor_id, action, target_type) values (account_id, 'ai_connection_delete', 'ai_credentials');
  end if;
  return removed > 0;
end;
$$;
revoke all on function public.ai_credential_delete() from public, anon, authenticated, service_role;
grant execute on function public.ai_credential_delete() to authenticated;

-- FR-BYOK-10: 30 AI requests per account per minute. Returns seconds to wait, or 0 when the request may go on.
create function public.ai_take_request()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  minute timestamptz := date_trunc('minute', now());
  used integer;
begin
  perform public.ai_credential_session();
  perform public.ai_credentials_purge();
  delete from public.ai_request_counters where user_id = account_id and kind = 'request' and window_start < minute;
  insert into public.ai_request_counters (user_id, kind, window_start, count) values (account_id, 'request', minute, 1)
    on conflict (user_id, kind, window_start) do update set count = public.ai_request_counters.count + 1
    returning count into used;
  if used > 30 then
    return greatest(1, ceil(extract(epoch from (minute + interval '1 minute' - now())))::integer);
  end if;
  return 0;
end;
$$;
revoke all on function public.ai_take_request() from public, anon, authenticated, service_role;
grant execute on function public.ai_take_request() to authenticated;

-- Uji Koneksi sends a short message to the user's provider and can use their quota: 5 tests per account per
-- 10 minutes. Returns seconds to wait, or 0 when the test may go on.
create function public.ai_take_test()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  slot timestamptz := to_timestamp(floor(extract(epoch from now()) / 600) * 600);
  used integer;
begin
  perform public.ai_credential_session();
  delete from public.ai_request_counters where user_id = account_id and kind = 'test' and window_start < slot;
  insert into public.ai_request_counters (user_id, kind, window_start, count) values (account_id, 'test', slot, 1)
    on conflict (user_id, kind, window_start) do update set count = public.ai_request_counters.count + 1
    returning count into used;
  if used > 5 then
    return greatest(1, ceil(extract(epoch from (slot + interval '10 minutes' - now())))::integer);
  end if;
  return 0;
end;
$$;
revoke all on function public.ai_take_test() from public, anon, authenticated, service_role;
grant execute on function public.ai_take_test() to authenticated;

create function public.tanya_run_start(
  p_mode text, p_intent text, p_provider_id text, p_model text, p_categories text[], p_sources jsonb, p_blocked jsonb
)
returns uuid
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  run_id uuid;
begin
  perform public.ai_credential_session();
  if p_mode is null or p_mode not in ('direct', 'handoff') or p_intent is null or p_categories is null
    or not p_categories <@ array['profil', 'akademik', 'lomba', 'tugas', 'progres', 'evaluasi', 'ingatan', 'dokumen']
    or p_sources is null or jsonb_typeof(p_sources) <> 'array' or p_blocked is null or jsonb_typeof(p_blocked) <> 'array' then
    return null;
  end if;
  insert into public.tanya_runs (user_id, mode, intent, provider_id, model, categories_sent, sources, blocked, status, finished_at)
    values (account_id, p_mode, p_intent, p_provider_id, p_model, p_categories, p_sources, p_blocked,
      case p_mode when 'handoff' then 'done' else 'started' end, case p_mode when 'handoff' then now() end)
    returning id into run_id;
  return run_id;
end;
$$;
revoke all on function public.tanya_run_start(text, text, text, text, text[], jsonb, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.tanya_run_start(text, text, text, text, text[], jsonb, jsonb) to authenticated;

create function public.tanya_run_finish(p_run_id uuid, p_status text, p_error_code text, p_input_tokens integer, p_output_tokens integer)
returns boolean
language plpgsql
security definer set search_path = ''
as $$
declare
  changed integer;
begin
  perform public.ai_credential_session();
  if p_status is null or p_status not in ('done', 'error', 'stopped') then return false; end if;
  update public.tanya_runs
    set status = p_status, error_code = left(p_error_code, 40), input_tokens = greatest(p_input_tokens, 0),
        output_tokens = greatest(p_output_tokens, 0), finished_at = now()
    where id = p_run_id and user_id = auth.uid() and status = 'started';
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;
revoke all on function public.tanya_run_finish(uuid, text, text, integer, integer) from public, anon, authenticated, service_role;
grant execute on function public.tanya_run_finish(uuid, text, text, integer, integer) to authenticated;

-- Scheduled purge every 10 minutes where pg_cron is installed (Supabase). Skipped silently elsewhere; the purge
-- also runs on every AI call, so the schedule only covers the case where nobody uses the feature.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('ai-credentials-purge', '*/10 * * * *', 'select public.ai_credentials_purge()');
  end if;
exception when others then
  raise notice 'ai-credentials-purge was not scheduled: %', sqlerrm;
end;
$$;
