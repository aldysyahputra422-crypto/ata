-- Guardian consent for accounts under 18 (FR-AUTH-07) and the one gate every AI feature calls before it
-- reads account data. Nothing here trusts the client: a consent only becomes 'verified' through a single-use
-- token that the server sent to the guardian's own contact, and only service_role can create or redeem one.

-- Only the birth year is known, so an account counts as a minor until the year it is certainly 18 everywhere
-- in that year (year difference of 19). Unknown age is never treated as adult.
create function public.is_minor(p_birth_year numeric)
returns boolean
language sql
stable
set search_path = ''
as $$
  select extract(year from (now() at time zone 'Asia/Jakarta'))::numeric - p_birth_year < 19;
$$;
revoke all on function public.is_minor(numeric) from public, anon, authenticated, service_role;

create function public.ai_categories()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['profil', 'akademik', 'lomba', 'tugas', 'progres', 'evaluasi', 'ingatan', 'dokumen'];
$$;
revoke all on function public.ai_categories() from public, anon, authenticated, service_role;

create table public.guardian_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'declined', 'revoked', 'superseded')),
  doc text not null default 'guardian_ai_consent',
  version text not null check (char_length(version) between 1 and 40),
  scope text[] not null check (cardinality(scope) > 0 and scope <@ public.ai_categories()),
  guardian_name text not null check (char_length(guardian_name) between 2 and 80),
  guardian_contact_hash text not null check (guardian_contact_hash ~ '^[0-9a-f]{64}$'),
  guardian_contact_masked text not null check (char_length(guardian_contact_masked) between 3 and 120),
  requested_at timestamptz not null default now(),
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_expires_at timestamptz not null,
  delivery_channel text not null default 'email' check (delivery_channel = 'email'),
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'failed')),
  delivery_ref text check (char_length(delivery_ref) <= 200),
  delivered_at timestamptz,
  verified_at timestamptz,
  verification_method text check (verification_method = 'guardian_email_link'),
  verifier_name text check (char_length(verifier_name) between 2 and 80),
  declined_at timestamptz,
  revoke_token_hash text unique check (revoke_token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  revoked_by text check (revoked_by in ('student', 'guardian', 'system')),
  -- A verified row always carries its proof.
  check (status <> 'verified' or (verified_at is not null and verification_method is not null
    and verifier_name is not null and delivery_status = 'sent')),
  check (status <> 'pending' or token_hash is not null)
);
create unique index guardian_consents_one_open_idx on public.guardian_consents (user_id) where status in ('pending', 'verified');
create index guardian_consents_user_at_idx on public.guardian_consents (user_id, requested_at);

alter table public.guardian_consents enable row level security;
revoke all on public.guardian_consents from public, anon, authenticated, service_role;
-- No role writes this table directly, service_role included: rows change only through the functions below.
grant select (id, user_id, status, doc, version, scope, guardian_name, guardian_contact_masked, requested_at, token_expires_at,
  delivery_channel, delivery_status, delivered_at, verified_at, verification_method, declined_at, revoked_at, revoked_by)
  on public.guardian_consents to authenticated, service_role;
create policy guardian_consents_read_own on public.guardian_consents for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));

create function public.guardian_consent_verified(p_user_id uuid, p_category text default null)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.guardian_consents
    where user_id = p_user_id and status = 'verified' and (p_category is null or p_category = any (scope))
  );
$$;
revoke all on function public.guardian_consent_verified(uuid, text) from public, anon, authenticated, service_role;

-- Turns every category off and audits it once. Used when consent ends or an account becomes a minor.
create function public.reset_ai_permissions(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.ai_permissions
    set categories = (select jsonb_object_agg(c, false) from unnest(public.ai_categories()) c), updated_at = now()
    where user_id = p_user_id and exists (select 1 from jsonb_each(categories) e where e.value = 'true'::jsonb);
  if found then
    insert into public.audit_log (actor_type, actor_id, action, target_type, meta)
      values ('system', p_user_id, 'ai_permissions_reset', 'ai_permissions', jsonb_build_object('reason', p_reason));
  end if;
end;
$$;
revoke all on function public.reset_ai_permissions(uuid, text) from public, anon, authenticated, service_role;

-- The gate. reason: guardian_consent_required (minor without verified consent for this category, or age unknown),
-- permission_off (the account has not turned the category on, or the category does not exist).
create function public.ai_processing_gate(p_user_id uuid, p_category text)
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  year smallint;
  found_profile boolean;
begin
  select birth_year, true into year, found_profile from public.profiles where user_id = p_user_id;
  if p_user_id is null or found_profile is not true then
    return jsonb_build_object('allowed', false, 'reason', 'signed_out');
  end if;
  if year is null or (public.is_minor(year) and not public.guardian_consent_verified(p_user_id, p_category)) then
    return jsonb_build_object('allowed', false, 'reason', 'guardian_consent_required');
  end if;
  if p_category is null or not p_category = any (public.ai_categories()) or not coalesce(
    (select (categories ->> p_category)::boolean from public.ai_permissions where user_id = p_user_id), false) then
    return jsonb_build_object('allowed', false, 'reason', 'permission_off');
  end if;
  return jsonb_build_object('allowed', true);
end;
$$;
revoke all on function public.ai_processing_gate(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.ai_processing_gate(uuid, text) to service_role;

-- The same gate for the calling session; an ended session is signed out.
create function public.can_process_ai(p_category text)
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
begin
  if auth.uid() is null or not public.account_session_active() then
    return jsonb_build_object('allowed', false, 'reason', 'signed_out');
  end if;
  return public.ai_processing_gate(auth.uid(), p_category);
end;
$$;
revoke all on function public.can_process_ai(text) from public, anon, authenticated, service_role;
grant execute on function public.can_process_ai(text) to authenticated;

-- Last line of defence: no writer, whatever its role, can store an enabled category for an account that is a
-- minor without verified consent or whose age is unknown.
create function public.enforce_ai_permission_consent()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  year smallint;
  category text;
begin
  select birth_year into year from public.profiles where user_id = new.user_id;
  for category in select e.key from jsonb_each(new.categories) e where e.value <> 'false'::jsonb loop
    if year is null or (public.is_minor(year) and not public.guardian_consent_verified(new.user_id, category)) then
      raise check_violation using message = 'guardian consent required';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.enforce_ai_permission_consent() from public, anon, authenticated, service_role;

-- Existing accounts: a minor (or unknown age) keeps no enabled category, and a minor's onboarding is not done
-- until a guardian consents.
update public.ai_permissions p
  set categories = (select jsonb_object_agg(c, false) from unnest(public.ai_categories()) c), updated_at = now()
  where exists (select 1 from jsonb_each(p.categories) e where e.value <> 'false'::jsonb)
    and not exists (select 1 from public.profiles f where f.user_id = p.user_id and not public.is_minor(f.birth_year));
update public.profiles set onboarding_done = false, updated_at = now()
  where onboarding_done and public.is_minor(birth_year);

create trigger ata_enforce_ai_permission_consent
  before insert or update on public.ai_permissions for each row execute function public.enforce_ai_permission_consent();

-- set_ai_permission (0007) stays as the writer; the account now reaches it only through this check.
alter function public.set_ai_permission(text, boolean) rename to set_ai_permission_unchecked;
revoke all on function public.set_ai_permission_unchecked(text, boolean) from public, anon, authenticated, service_role;

create function public.set_ai_permission(p_category text, p_allowed boolean)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  year smallint;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  if p_allowed is true and p_category = any (public.ai_categories()) then
    -- The profile row is the per-account lock shared with consent changes and birth-year changes.
    select birth_year into year from public.profiles where user_id = account_id for update;
    if year is null then return jsonb_build_object('error', 'age_required'); end if;
    if public.is_minor(year) and not public.guardian_consent_verified(account_id, p_category) then
      return jsonb_build_object('error', 'guardian_consent_required');
    end if;
  end if;
  return public.set_ai_permission_unchecked(p_category, p_allowed);
end;
$$;
revoke all on function public.set_ai_permission(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_ai_permission(text, boolean) to authenticated;

-- update_profile (0007) stays as the writer. A birth year that makes the account a minor cannot be changed to
-- an adult year or cleared by the account itself, and an account that becomes a minor loses what needs consent.
alter function public.update_profile(jsonb) rename to update_profile_unchecked;
revoke all on function public.update_profile_unchecked(jsonb) from public, anon, authenticated, service_role;

create function public.update_profile(p_patch jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  old_year smallint;
  was_minor boolean;
  new_year jsonb;
  result jsonb;
  row public.profiles;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  select birth_year into old_year from public.profiles where user_id = account_id for update;
  was_minor := coalesce(public.is_minor(old_year), false);
  if jsonb_typeof(p_patch) = 'object' and p_patch ? 'birth_year' then
    new_year := p_patch -> 'birth_year';
    if was_minor and (jsonb_typeof(new_year) = 'null'
      or (jsonb_typeof(new_year) = 'number' and not public.is_minor((new_year #>> '{}')::numeric))) then
      insert into public.audit_log (actor_id, action, target_type) values (account_id, 'age_change_refused', 'profile');
      return jsonb_build_object('error', 'age_locked', 'field', 'birth_year');
    end if;
  end if;

  result := public.update_profile_unchecked(p_patch);
  if result ? 'error' then return result; end if;

  select * into row from public.profiles where user_id = account_id;
  if not was_minor and public.is_minor(row.birth_year) and not public.guardian_consent_verified(account_id) then
    perform public.reset_ai_permissions(account_id, 'became_minor');
    if row.onboarding_done then
      update public.profiles set onboarding_done = false, updated_at = now() where user_id = account_id returning * into row;
    end if;
    result := jsonb_build_object('profile', to_jsonb(row));
  end if;
  return result;
end;
$$;
revoke all on function public.update_profile(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.update_profile(jsonb) to authenticated;

-- FR-AUTH-07: a minor's onboarding is done only once a guardian's consent is verified.
create or replace function public.complete_onboarding()
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  row public.profiles;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  select * into row from public.profiles where user_id = account_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if row.display_name is null or row.jenjang is null or row.birth_year is null then
    return jsonb_build_object('error', 'incomplete');
  end if;
  if public.is_minor(row.birth_year) and not public.guardian_consent_verified(account_id) then
    return jsonb_build_object('error', 'guardian_consent_required');
  end if;
  if not row.onboarding_done then
    update public.profiles set onboarding_done = true, updated_at = now() where user_id = account_id;
  end if;
  return jsonb_build_object('done', true);
end;
$$;

-- What the account may know about its own consent. A pending request past its expiry reads as 'expired'.
create function public.guardian_consent_status()
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  year smallint;
  c public.guardian_consents;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  select birth_year into year from public.profiles where user_id = account_id;
  if year is null then return jsonb_build_object('age_known', false, 'required', false, 'status', 'age_unknown'); end if;
  if not public.is_minor(year) then return jsonb_build_object('age_known', true, 'required', false, 'status', 'not_required'); end if;
  -- a request whose email never left is not shown as waiting: the account gets the form back to correct the address
  select * into c from public.guardian_consents where user_id = account_id and status <> 'superseded'
    and not (status = 'pending' and delivery_status = 'failed')
    order by requested_at desc limit 1;
  if not found then return jsonb_build_object('age_known', true, 'required', true, 'status', 'none'); end if;
  return jsonb_build_object(
    'age_known', true, 'required', true,
    'status', case when c.status = 'pending' and c.token_expires_at <= now() then 'expired' else c.status end,
    'guardian_name', c.guardian_name, 'contact_masked', c.guardian_contact_masked, 'version', c.version, 'scope', c.scope,
    'requested_at', c.requested_at, 'expires_at', c.token_expires_at, 'delivery_status', c.delivery_status,
    'verified_at', c.verified_at, 'declined_at', c.declined_at, 'revoked_at', c.revoked_at, 'revoked_by', c.revoked_by);
end;
$$;
revoke all on function public.guardian_consent_status() from public, anon, authenticated, service_role;
grant execute on function public.guardian_consent_status() to authenticated;

-- Opens a request. service_role only: the caller is the server, which made the token and keeps it away from the
-- account. An account that could name its own token hash could approve itself.
create function public.create_guardian_consent_request(
  p_user_id uuid, p_guardian_name text, p_contact_hash text, p_contact_masked text, p_token_hash text, p_version text,
  p_ttl_hours integer default 72)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  year smallint;
  request_id uuid;
  expires timestamptz;
begin
  select birth_year into year from public.profiles where user_id = p_user_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if year is null then return jsonb_build_object('error', 'age_required'); end if;
  if not public.is_minor(year) then return jsonb_build_object('error', 'not_required'); end if;
  if p_guardian_name is null or char_length(btrim(p_guardian_name)) not between 2 and 80
    or p_contact_hash is null or p_contact_hash !~ '^[0-9a-f]{64}$'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_contact_masked is null or char_length(p_contact_masked) not between 3 and 120
    or p_version is null or char_length(p_version) not between 1 and 40
    or p_ttl_hours is null or p_ttl_hours not between 1 and 168 then
    return jsonb_build_object('error', 'validation');
  end if;
  if public.guardian_consent_verified(p_user_id) then return jsonb_build_object('error', 'already_verified'); end if;
  if (select count(*) from public.guardian_consents
      where user_id = p_user_id and requested_at > now() - interval '24 hours') >= 5 then
    return jsonb_build_object('error', 'rate_limited');
  end if;

  update public.guardian_consents set status = 'superseded', token_hash = null
    where user_id = p_user_id and status = 'pending';
  expires := now() + p_ttl_hours * interval '1 hour';
  insert into public.guardian_consents
    (user_id, version, scope, guardian_name, guardian_contact_hash, guardian_contact_masked, token_hash, token_expires_at)
    values (p_user_id, p_version, public.ai_categories(), btrim(p_guardian_name), p_contact_hash, p_contact_masked, p_token_hash, expires)
    returning id into request_id;
  insert into public.audit_log (actor_id, action, target_type, target_id)
    values (p_user_id, 'guardian_consent_requested', 'guardian_consent', request_id);
  return jsonb_build_object('id', request_id, 'expires_at', expires);
end;
$$;
revoke all on function public.create_guardian_consent_request(uuid, text, text, text, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.create_guardian_consent_request(uuid, text, text, text, text, text, integer) to service_role;

-- The delivery adapter's outcome. A token that was never sent to the guardian can never verify anything.
create function public.record_guardian_consent_delivery(p_id uuid, p_sent boolean, p_ref text default null)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_sent is null then return jsonb_build_object('error', 'validation'); end if;
  update public.guardian_consents set
      delivery_status = case when p_sent then 'sent' else 'failed' end,
      delivered_at = case when p_sent then now() end,
      delivery_ref = left(p_ref, 200)
    where id = p_id and status = 'pending' and delivery_status = 'queued';
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('delivery_status', case when p_sent then 'sent' else 'failed' end);
end;
$$;
revoke all on function public.record_guardian_consent_delivery(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.record_guardian_consent_delivery(uuid, boolean, text) to service_role;

-- What the guardian's page shows for a link: an open request (kind confirm) or a verified consent (kind withdraw).
create function public.guardian_consent_lookup(p_token_hash text)
returns jsonb
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  c public.guardian_consents;
  student text;
begin
  if p_token_hash is null then return jsonb_build_object('error', 'invalid_token'); end if;
  select * into c from public.guardian_consents
    where (token_hash = p_token_hash and status = 'pending' and delivery_status = 'sent' and token_expires_at > now())
       or (revoke_token_hash = p_token_hash and status = 'verified');
  if not found then return jsonb_build_object('error', 'invalid_token'); end if;
  select display_name into student from public.profiles where user_id = c.user_id;
  return jsonb_build_object(
    'kind', case when c.status = 'pending' then 'confirm' else 'withdraw' end,
    'student_name', student, 'guardian_name', c.guardian_name, 'version', c.version, 'scope', c.scope,
    'expires_at', c.token_expires_at, 'verified_at', c.verified_at);
end;
$$;
revoke all on function public.guardian_consent_lookup(text) from public, anon, authenticated, service_role;
grant execute on function public.guardian_consent_lookup(text) to service_role;

-- The guardian's answer. The token is single-use: it is cleared whether the answer is yes or no.
create function public.confirm_guardian_consent(p_token_hash text, p_approve boolean, p_verifier_name text, p_revoke_token_hash text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  c public.guardian_consents;
begin
  if p_token_hash is null or p_approve is null then return jsonb_build_object('error', 'validation'); end if;
  if p_approve and (p_verifier_name is null or char_length(btrim(p_verifier_name)) not between 2 and 80
    or p_revoke_token_hash is null or p_revoke_token_hash !~ '^[0-9a-f]{64}$' or p_revoke_token_hash = p_token_hash) then
    return jsonb_build_object('error', 'validation');
  end if;
  -- profile first, then the consent: the same lock order as revoke_guardian_consent, so the two cannot deadlock
  perform 1 from public.profiles where user_id = (select user_id from public.guardian_consents where token_hash = p_token_hash) for update;
  select * into c from public.guardian_consents where token_hash = p_token_hash and status = 'pending' for update;
  if not found or c.delivery_status <> 'sent' or c.token_expires_at <= now() then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  if p_approve then
    update public.guardian_consents set status = 'verified', verified_at = now(), verification_method = 'guardian_email_link',
      verifier_name = btrim(p_verifier_name), token_hash = null, revoke_token_hash = p_revoke_token_hash where id = c.id;
  else
    update public.guardian_consents set status = 'declined', declined_at = now(), token_hash = null where id = c.id;
  end if;
  insert into public.audit_log (actor_type, action, target_type, target_id, meta)
    values ('system', case when p_approve then 'guardian_consent_verified' else 'guardian_consent_declined' end,
      'guardian_consent', c.id, jsonb_build_object('version', c.version));
  return jsonb_build_object('status', case when p_approve then 'verified' else 'declined' end);
end;
$$;
revoke all on function public.confirm_guardian_consent(text, boolean, text, text) from public, anon, authenticated, service_role;
grant execute on function public.confirm_guardian_consent(text, boolean, text, text) to service_role;

-- Ends a consent: every category goes off and, while the account is still a minor, onboarding is open again.
create function public.end_guardian_consent(p_id uuid, p_user_id uuid, p_by text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.guardian_consents set status = 'revoked', revoked_at = now(), revoked_by = p_by,
    token_hash = null, revoke_token_hash = null where id = p_id;
  perform public.reset_ai_permissions(p_user_id, 'guardian_consent_revoked');
  update public.profiles set onboarding_done = false, updated_at = now()
    where user_id = p_user_id and onboarding_done and public.is_minor(birth_year);
  insert into public.audit_log (actor_type, actor_id, action, target_type, target_id, meta)
    values (case when p_by = 'student' then 'user' else 'system' end, case when p_by = 'student' then p_user_id end,
      'guardian_consent_revoked', 'guardian_consent', p_id, jsonb_build_object('by', p_by));
end;
$$;
revoke all on function public.end_guardian_consent(uuid, uuid, text) from public, anon, authenticated, service_role;

-- Withdrawal by the guardian, with the link shown once when the consent was given.
create function public.withdraw_guardian_consent(p_revoke_token_hash text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  c public.guardian_consents;
begin
  if p_revoke_token_hash is null then return jsonb_build_object('error', 'invalid_token'); end if;
  perform 1 from public.profiles
    where user_id = (select user_id from public.guardian_consents where revoke_token_hash = p_revoke_token_hash) for update;
  select * into c from public.guardian_consents where revoke_token_hash = p_revoke_token_hash and status = 'verified' for update;
  if not found then return jsonb_build_object('error', 'invalid_token'); end if;
  perform public.end_guardian_consent(c.id, c.user_id, 'guardian');
  return jsonb_build_object('status', 'revoked');
end;
$$;
revoke all on function public.withdraw_guardian_consent(text) from public, anon, authenticated, service_role;
grant execute on function public.withdraw_guardian_consent(text) to service_role;

-- Withdrawal by the account itself: cancels an open request or revokes a verified consent.
create function public.revoke_guardian_consent()
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  c public.guardian_consents;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  perform 1 from public.profiles where user_id = account_id for update;
  select * into c from public.guardian_consents where user_id = account_id and status in ('pending', 'verified') for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  perform public.end_guardian_consent(c.id, account_id, 'student');
  return jsonb_build_object('status', 'revoked');
end;
$$;
revoke all on function public.revoke_guardian_consent() from public, anon, authenticated, service_role;
grant execute on function public.revoke_guardian_consent() to authenticated;

-- Account export stays complete: same function as 0006 plus the guardian consent record, without hashes.
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
    'guardian_consents', coalesce((select jsonb_agg(
        to_jsonb(g) - 'guardian_contact_hash' - 'token_hash' - 'revoke_token_hash' - 'delivery_ref' - 'verifier_name' order by requested_at)
      from public.guardian_consents g where g.user_id = account_id), '[]'::jsonb),
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
