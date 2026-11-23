-- Guardian consent for accounts under 18 (FR-AUTH-07) and the one gate every AI feature calls before it
-- reads account data. Nothing here trusts the client: a consent only becomes 'verified' through a single-use
-- token that the server sent to the guardian's own contact, and only service_role can create or redeem one.

-- Age comes from the full birth date, on today's date in the account's timezone. An account from before this
-- migration may hold only a birth year: it is an adult once the year difference is 19 (18 or older on every
-- day of that year) and counts as a minor until then, so the ambiguous year (17 or 18) stays a minor until the
-- date is completed. Unknown age is never treated as adult.
alter table public.profiles
  add column birth_date date,
  add column birth_date_corrections smallint not null default 0 check (birth_date_corrections >= 0);

create function public.age_status(p_birth_date date, p_birth_year numeric, p_timezone text, p_at timestamptz default now())
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_birth_date is not null then
      case when extract(year from age(t.today, p_birth_date)) >= 18 then 'adult' else 'minor' end
    when p_birth_year is not null then
      case when extract(year from t.today)::numeric - p_birth_year >= 19 then 'adult' else 'minor' end
    else 'unknown'
  end
  from (select (p_at at time zone coalesce(
    (select name from pg_catalog.pg_timezone_names where name = p_timezone), 'Asia/Jakarta'))::date as today) t;
$$;
revoke all on function public.age_status(date, numeric, text, timestamptz) from public, anon, authenticated, service_role;

create function public.account_age(p_user_id uuid)
returns text
language sql
stable
security definer set search_path = ''
as $$
  select public.age_status(birth_date, birth_year, timezone) from public.profiles where user_id = p_user_id;
$$;
revoke all on function public.account_age(uuid) from public, anon, authenticated, service_role;

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
  -- what the person who answered stated about themselves; the link itself only proves access to the inbox
  verifier_declaration text check (verifier_declaration = 'parent_or_legal_guardian'),
  declined_at timestamptz,
  -- a guardian who declines may ask for the child's account to be deleted (see purge_guardian_requested_deletions)
  deletion_requested_at timestamptz,
  deletion_due_at timestamptz,
  deletion_cancelled_at timestamptz,
  revoke_token_hash text unique check (revoke_token_hash ~ '^[0-9a-f]{64}$'),
  revoked_at timestamptz,
  revoked_by text check (revoked_by in ('student', 'guardian', 'system')),
  -- A verified row always carries its proof.
  check (status <> 'verified' or (verified_at is not null and verification_method is not null
    and verifier_name is not null and verifier_declaration is not null and delivery_status = 'sent')),
  check (deletion_requested_at is null or (status = 'declined' and deletion_due_at is not null)),
  check (status <> 'pending' or token_hash is not null)
);
create unique index guardian_consents_one_open_idx on public.guardian_consents (user_id) where status in ('pending', 'verified');
create index guardian_consents_user_at_idx on public.guardian_consents (user_id, requested_at);

alter table public.guardian_consents enable row level security;
revoke all on public.guardian_consents from public, anon, authenticated, service_role;
-- No role writes this table directly, service_role included: rows change only through the functions below.
grant select (id, user_id, status, doc, version, scope, guardian_name, guardian_contact_masked, requested_at, token_expires_at,
  delivery_channel, delivery_status, delivered_at, verified_at, verification_method, declined_at, revoked_at, revoked_by,
  deletion_requested_at, deletion_due_at, deletion_cancelled_at)
  on public.guardian_consents to authenticated, service_role;
create policy guardian_consents_read_own on public.guardian_consents for select to authenticated
  using (user_id = (select auth.uid()) and (select public.account_session_active()));

-- Birth date corrections that would turn a minor into an adult. The account cannot make that change itself:
-- it names the corrected date, the server sends a single-use link to the parent/guardian, and the date changes
-- only when they confirm it. Like a consent, this proves access to that inbox, not identity.
create table public.birth_date_corrections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'applied', 'declined', 'cancelled', 'superseded')),
  new_birth_date date not null,
  guardian_name text not null check (char_length(guardian_name) between 2 and 80),
  guardian_contact_hash text not null check (guardian_contact_hash ~ '^[0-9a-f]{64}$'),
  guardian_contact_masked text not null check (char_length(guardian_contact_masked) between 3 and 120),
  requested_at timestamptz not null default now(),
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  token_expires_at timestamptz not null,
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'failed')),
  delivery_ref text check (char_length(delivery_ref) <= 200),
  delivered_at timestamptz,
  decided_at timestamptz,
  verification_method text check (verification_method = 'guardian_email_link'),
  verifier_name text check (char_length(verifier_name) between 2 and 80),
  verifier_declaration text check (verifier_declaration = 'parent_or_legal_guardian'),
  check (status <> 'applied' or (decided_at is not null and verification_method is not null
    and verifier_name is not null and verifier_declaration is not null and delivery_status = 'sent')),
  check (status <> 'pending' or token_hash is not null)
);
create unique index birth_date_corrections_one_open_idx on public.birth_date_corrections (user_id) where status = 'pending';
create index birth_date_corrections_user_at_idx on public.birth_date_corrections (user_id, requested_at);

alter table public.birth_date_corrections enable row level security;
revoke all on public.birth_date_corrections from public, anon, authenticated, service_role;
grant select (id, user_id, status, new_birth_date, guardian_name, guardian_contact_masked, requested_at, token_expires_at,
  delivery_status, delivered_at, decided_at, verification_method)
  on public.birth_date_corrections to authenticated, service_role;
create policy birth_date_corrections_read_own on public.birth_date_corrections for select to authenticated
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
  age text;
  found_profile boolean;
begin
  select public.age_status(birth_date, birth_year, timezone), true into age, found_profile
    from public.profiles where user_id = p_user_id;
  if p_user_id is null or found_profile is not true then
    return jsonb_build_object('allowed', false, 'reason', 'signed_out');
  end if;
  if age <> 'adult' and not (age = 'minor' and public.guardian_consent_verified(p_user_id, p_category)) then
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
  age text := coalesce(public.account_age(new.user_id), 'unknown');
  category text;
begin
  for category in select e.key from jsonb_each(new.categories) e where e.value <> 'false'::jsonb loop
    if age <> 'adult' and not (age = 'minor' and public.guardian_consent_verified(new.user_id, category)) then
      raise check_violation using message = 'guardian consent required';
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.enforce_ai_permission_consent() from public, anon, authenticated, service_role;

-- Existing accounts: a minor (or unknown age) keeps no enabled category, and a minor's onboarding is not done
-- until a guardian consents, which is the pending state. Nothing else is touched: no row of user data is deleted.
update public.ai_permissions p
  set categories = (select jsonb_object_agg(c, false) from unnest(public.ai_categories()) c), updated_at = now()
  where exists (select 1 from jsonb_each(p.categories) e where e.value <> 'false'::jsonb)
    and coalesce(public.account_age(p.user_id), 'unknown') <> 'adult';
update public.profiles set onboarding_done = false, updated_at = now()
  where onboarding_done and public.age_status(birth_date, birth_year, timezone) = 'minor';

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
  age text;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  if p_allowed is true and p_category = any (public.ai_categories()) then
    -- The profile row is the per-account lock shared with consent changes and birth-date changes.
    select public.age_status(birth_date, birth_year, timezone) into age from public.profiles where user_id = account_id for update;
    if coalesce(age, 'unknown') = 'unknown' then return jsonb_build_object('error', 'age_required'); end if;
    if age = 'minor' and not public.guardian_consent_verified(account_id, p_category) then
      return jsonb_build_object('error', 'guardian_consent_required');
    end if;
  end if;
  return public.set_ai_permission_unchecked(p_category, p_allowed);
end;
$$;
revoke all on function public.set_ai_permission(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_ai_permission(text, boolean) to authenticated;

-- update_profile (0007) stays as the writer of every other field. The birth date is written here:
--   * the first date, or the date that completes a stored birth year, is the account's own statement;
--   * a later change is a correction: audited, at most two per account, and never from minor to adult. That
--     direction goes through request_birth_date_correction, which a parent/guardian confirms from their inbox;
--   * the bare birth year is no longer writable.
-- An account that becomes a minor loses what needs consent.
alter function public.update_profile(jsonb) rename to update_profile_unchecked;
revoke all on function public.update_profile_unchecked(jsonb) from public, anon, authenticated, service_role;

create function public.birth_date_corrections_max()
returns integer
language sql
immutable
set search_path = ''
as $$ select 2; $$;
revoke all on function public.birth_date_corrections_max() from public, anon, authenticated, service_role;

-- What follows a change of age status: an account that is now a minor without consent is pending again.
create function public.apply_age_change(p_user_id uuid, p_old_age text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if public.account_age(p_user_id) = 'minor' and p_old_age is distinct from 'minor'
    and not public.guardian_consent_verified(p_user_id) then
    perform public.reset_ai_permissions(p_user_id, 'became_minor');
    update public.profiles set onboarding_done = false, updated_at = now() where user_id = p_user_id and onboarding_done;
  end if;
end;
$$;
revoke all on function public.apply_age_change(uuid, text) from public, anon, authenticated, service_role;

create function public.update_profile(p_patch jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  cur public.profiles;
  patch jsonb := p_patch;
  old_age text;
  new_age text;
  new_date date;
  new_zone text;
  correction boolean := false;
  result jsonb;
  row public.profiles;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then return jsonb_build_object('error', 'validation'); end if;
  select * into cur from public.profiles where user_id = account_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if p_patch ? 'birth_year' then return jsonb_build_object('error', 'validation', 'field', 'birth_year'); end if;
  old_age := public.age_status(cur.birth_date, cur.birth_year, cur.timezone);
  -- the timezone this call leaves the account with: it decides today's date, so it decides the new age too
  -- (trimmed the way the profile writer stores it, so the check and the stored value cannot differ)
  new_zone := case when p_patch ? 'timezone' then nullif(btrim(p_patch ->> 'timezone'), '') else cur.timezone end;

  if p_patch ? 'birth_date' then
    patch := p_patch - 'birth_date';
    if jsonb_typeof(p_patch -> 'birth_date') <> 'string' or (p_patch ->> 'birth_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
      return jsonb_build_object('error', 'validation', 'field', 'birth_date');
    end if;
    begin
      new_date := (p_patch ->> 'birth_date')::date;
    exception when others then
      return jsonb_build_object('error', 'validation', 'field', 'birth_date');
    end;
    if new_date < date '1940-01-01' or new_date > (now() - interval '5 years')::date then
      return jsonb_build_object('error', 'validation', 'field', 'birth_date');
    end if;
    if new_date is not distinct from cur.birth_date then
      new_date := null;
    else
      new_age := public.age_status(new_date, null, new_zone);
      correction := cur.birth_date is not null
        or (cur.birth_year is not null and cur.birth_year <> extract(year from new_date));
      -- adult in the saved timezone: the guardian's correction link is the way. Adult only in the timezone sent
      -- along is refused further down as a timezone change, which no correction link can settle.
      -- (a date that stays under 18 in the timezone sent along is a minor's own correction)
      if correction and old_age = 'minor' and new_age = 'adult' and public.age_status(new_date, null, cur.timezone) = 'adult' then
        insert into public.audit_log (actor_id, action, target_type) values (account_id, 'birth_date_change_refused', 'profile');
        return jsonb_build_object('error', 'guardian_verification_required', 'field', 'birth_date');
      end if;
      if correction and cur.birth_date_corrections >= public.birth_date_corrections_max() then
        return jsonb_build_object('error', 'correction_limit', 'field', 'birth_date');
      end if;
    end if;
  end if;

  -- A timezone further east reaches the 18th birthday up to a day earlier. A minor does not become an adult by
  -- moving the clock, with or without a new date in the same call: the change waits for the birthday.
  if old_age = 'minor' and new_zone is distinct from cur.timezone
    and public.age_status(coalesce(new_date, cur.birth_date),
      case when coalesce(new_date, cur.birth_date) is null then cur.birth_year end, new_zone) = 'adult'
    and public.age_status(coalesce(new_date, cur.birth_date),
      case when coalesce(new_date, cur.birth_date) is null then cur.birth_year end, cur.timezone) <> 'adult' then
    insert into public.audit_log (actor_id, action, target_type) values (account_id, 'timezone_change_refused', 'profile');
    return jsonb_build_object('error', 'guardian_verification_required', 'field', 'timezone');
  end if;

  if patch <> '{}'::jsonb then
    result := public.update_profile_unchecked(patch);
    if result ? 'error' then return result; end if;
  end if;
  if new_date is not null then
    update public.profiles set birth_date = new_date, birth_year = extract(year from new_date),
      birth_date_corrections = birth_date_corrections + correction::integer, updated_at = now() where user_id = account_id;
    update public.birth_date_corrections set status = 'superseded', token_hash = null where user_id = account_id and status = 'pending';
    insert into public.audit_log (actor_id, action, target_type, meta)
      values (account_id, case when correction then 'birth_date_corrected' else 'birth_date_set' end, 'profile',
        jsonb_build_object('from', old_age, 'to', new_age, 'by', 'account'));
  end if;
  -- the timezone can move today's date, so the status is read again whatever changed
  perform public.apply_age_change(account_id, old_age);
  select * into row from public.profiles where user_id = account_id;
  return jsonb_build_object('profile', to_jsonb(row));
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
  -- a birth year alone no longer finishes onboarding: the date decides the age
  if row.display_name is null or row.jenjang is null or row.birth_date is null then
    return jsonb_build_object('error', 'incomplete');
  end if;
  if public.age_status(row.birth_date, row.birth_year, row.timezone) = 'minor' and not public.guardian_consent_verified(account_id) then
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
  f public.profiles;
  age text;
  c public.guardian_consents;
  k public.birth_date_corrections;
  base jsonb;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  select * into f from public.profiles where user_id = account_id;
  age := public.age_status(f.birth_date, f.birth_year, f.timezone);
  select * into k from public.birth_date_corrections where user_id = account_id and status = 'pending'
    and delivery_status <> 'failed' and token_expires_at > now();
  -- account_state: pending is a minor without verified consent (every AI permission off, the request flow open)
  base := jsonb_build_object(
    'age_known', age <> 'unknown', 'birth_date_known', f.birth_date is not null, 'birth_date', f.birth_date,
    'corrections_left', greatest(public.birth_date_corrections_max() - f.birth_date_corrections, 0),
    'correction', case when k.id is null then null else jsonb_build_object('birth_date', k.new_birth_date,
      'guardian_name', k.guardian_name, 'contact_masked', k.guardian_contact_masked, 'expires_at', k.token_expires_at) end);
  if age = 'unknown' then
    return base || jsonb_build_object('required', false, 'status', 'age_unknown', 'account_state', 'age_unknown');
  end if;
  if age = 'adult' then
    return base || jsonb_build_object('required', false, 'status', 'not_required', 'account_state', 'not_required');
  end if;
  -- a request whose email never left is not shown as waiting: the account gets the form back to correct the address
  select * into c from public.guardian_consents where user_id = account_id and status <> 'superseded'
    and not (status = 'pending' and delivery_status = 'failed')
    order by requested_at desc limit 1;
  if not found then
    return base || jsonb_build_object('required', true, 'status', 'none', 'account_state', 'pending');
  end if;
  return base || jsonb_build_object(
    'required', true, 'account_state', case when c.status = 'verified' then 'granted' else 'pending' end,
    'status', case when c.status = 'pending' and c.token_expires_at <= now() then 'expired' else c.status end,
    'guardian_name', c.guardian_name, 'contact_masked', c.guardian_contact_masked, 'version', c.version, 'scope', c.scope,
    'requested_at', c.requested_at, 'expires_at', c.token_expires_at, 'delivery_status', c.delivery_status,
    'verified_at', c.verified_at, 'verification_method', c.verification_method,
    'declined_at', c.declined_at, 'revoked_at', c.revoked_at, 'revoked_by', c.revoked_by,
    'deletion_due_at', (select min(d.deletion_due_at) from public.guardian_consents d
      where d.user_id = account_id and d.deletion_requested_at is not null and d.deletion_cancelled_at is null));
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
  age text;
  request_id uuid;
  expires timestamptz;
begin
  select public.age_status(birth_date, birth_year, timezone) into age from public.profiles where user_id = p_user_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if age = 'unknown' then return jsonb_build_object('error', 'age_required'); end if;
  if age = 'adult' then return jsonb_build_object('error', 'not_required'); end if;
  if p_guardian_name is null or char_length(btrim(p_guardian_name)) not between 2 and 80
    or p_contact_hash is null or p_contact_hash !~ '^[0-9a-f]{64}$'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_contact_masked is null or char_length(p_contact_masked) not between 3 and 120
    or p_version is null or char_length(p_version) not between 1 and 40
    or p_ttl_hours is null or p_ttl_hours not between 1 and 168 then
    return jsonb_build_object('error', 'validation');
  end if;
  if public.guardian_consent_verified(p_user_id) then return jsonb_build_object('error', 'already_verified'); end if;
  -- while a guardian's deletion request is open, only that guardian can be asked again: another inbox must not
  -- be able to cancel it
  if exists (select 1 from public.guardian_consents where user_id = p_user_id and deletion_requested_at is not null
      and deletion_cancelled_at is null and guardian_contact_hash <> p_contact_hash) then
    return jsonb_build_object('error', 'guardian_mismatch');
  end if;
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
  k public.birth_date_corrections;
  student text;
begin
  if p_token_hash is null then return jsonb_build_object('error', 'invalid_token'); end if;
  select * into c from public.guardian_consents
    where (token_hash = p_token_hash and status = 'pending' and delivery_status = 'sent' and token_expires_at > now())
       or (revoke_token_hash = p_token_hash and status = 'verified');
  if not found then
    select * into k from public.birth_date_corrections
      where token_hash = p_token_hash and status = 'pending' and delivery_status = 'sent' and token_expires_at > now();
    if not found then return jsonb_build_object('error', 'invalid_token'); end if;
    select display_name into student from public.profiles where user_id = k.user_id;
    return jsonb_build_object('kind', 'correction', 'student_name', student, 'guardian_name', k.guardian_name,
      'birth_date', k.new_birth_date, 'expires_at', k.token_expires_at);
  end if;
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
-- An approval stores who stated to be the parent/guardian; the link proves access to the inbox and nothing more.
-- A refusal may carry a request to delete the child's account, which is carried out after a notice period.
create function public.confirm_guardian_consent(
  p_token_hash text, p_approve boolean, p_verifier_name text, p_revoke_token_hash text, p_request_deletion boolean default false)
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

  -- a correction link sent to another inbox ends once this guardian has answered
  update public.birth_date_corrections set status = 'superseded', token_hash = null
    where user_id = c.user_id and status = 'pending' and guardian_contact_hash <> c.guardian_contact_hash;
  if p_approve then
    update public.guardian_consents set status = 'verified', verified_at = now(), verification_method = 'guardian_email_link',
      verifier_name = btrim(p_verifier_name), verifier_declaration = 'parent_or_legal_guardian',
      token_hash = null, revoke_token_hash = p_revoke_token_hash where id = c.id;
    -- a guardian who now agrees withdraws an earlier request to delete the account
    update public.guardian_consents set deletion_cancelled_at = now()
      where user_id = c.user_id and deletion_requested_at is not null and deletion_cancelled_at is null
        and guardian_contact_hash = c.guardian_contact_hash;
    if found then
      insert into public.audit_log (actor_type, action, target_type, target_id, meta)
        values ('system', 'guardian_deletion_cancelled', 'guardian_consent', c.id, jsonb_build_object('reason', 'consent_verified'));
    end if;
  else
    update public.guardian_consents set status = 'declined', declined_at = now(), token_hash = null,
      deletion_requested_at = case when p_request_deletion then now() end,
      deletion_due_at = case when p_request_deletion then now() + interval '7 days' end where id = c.id;
    -- nothing the child turned on survives a refusal, and the account is pending again
    perform public.reset_ai_permissions(c.user_id, 'guardian_consent_declined');
    update public.profiles set onboarding_done = false, updated_at = now()
      where user_id = c.user_id and onboarding_done and public.age_status(birth_date, birth_year, timezone) = 'minor';
    if p_request_deletion then
      insert into public.audit_log (actor_type, action, target_type, target_id, meta)
        values ('system', 'guardian_deletion_requested', 'guardian_consent', c.id, jsonb_build_object('due_in_days', 7));
    end if;
  end if;
  insert into public.audit_log (actor_type, action, target_type, target_id, meta)
    values ('system', case when p_approve then 'guardian_consent_verified' else 'guardian_consent_declined' end,
      'guardian_consent', c.id, jsonb_build_object('version', c.version));
  return jsonb_build_object('status', case when p_approve then 'verified' else 'declined' end)
    || case when not p_approve and p_request_deletion then jsonb_build_object('deletion_requested', true) else '{}'::jsonb end;
end;
$$;
revoke all on function public.confirm_guardian_consent(text, boolean, text, text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.confirm_guardian_consent(text, boolean, text, text, boolean) to service_role;

-- Carries out the deletions a guardian asked for when refusing, once the notice period is over. It is not run
-- by any schedule in this migration: an operator or a scheduled server job calls it. Each deletion is audited
-- without the account's identity, like every account deletion (0003). An account that has since turned 18 or
-- got a verified consent is left alone.
create function public.purge_guardian_requested_deletions()
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  target record;
  done integer := 0;
begin
  for target in
    select distinct c.user_id from public.guardian_consents c
    where c.status = 'declined' and c.deletion_requested_at is not null and c.deletion_cancelled_at is null
      and c.deletion_due_at <= now()
      and public.account_age(c.user_id) <> 'adult' and not public.guardian_consent_verified(c.user_id)
  loop
    insert into public.audit_log (actor_type, action, target_type, meta)
      values ('system', 'guardian_requested_deletion_done', 'account', jsonb_build_object('by', 'guardian'));
    delete from auth.users where id = target.user_id;
    done := done + 1;
  end loop;
  return jsonb_build_object('deleted', done);
end;
$$;
revoke all on function public.purge_guardian_requested_deletions() from public, anon, authenticated, service_role;
grant execute on function public.purge_guardian_requested_deletions() to service_role;

-- Ends a consent: every category goes off and, while the account is still a minor, onboarding is open again.
create function public.end_guardian_consent(p_id uuid, p_user_id uuid, p_by text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  -- a correction link sent while a verified consent stood does not outlive it; cancelling an unanswered
  -- request leaves a correction alone
  update public.birth_date_corrections set status = 'superseded', token_hash = null
    where user_id = p_user_id and status = 'pending'
      and exists (select 1 from public.guardian_consents where id = p_id and status = 'verified');
  update public.guardian_consents set status = 'revoked', revoked_at = now(), revoked_by = p_by,
    token_hash = null, revoke_token_hash = null where id = p_id;
  perform public.reset_ai_permissions(p_user_id, 'guardian_consent_revoked');
  update public.profiles set onboarding_done = false, updated_at = now()
    where user_id = p_user_id and onboarding_done and public.age_status(birth_date, birth_year, timezone) = 'minor';
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

-- service_role only, like a consent request. If the account already has a guardian on record, the link goes to
-- that same inbox and no other.
create function public.create_birth_date_correction(
  p_user_id uuid, p_birth_date date, p_guardian_name text, p_contact_hash text, p_contact_masked text, p_token_hash text,
  p_ttl_hours integer default 72)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  f public.profiles;
  known text;
  request_id uuid;
  expires timestamptz;
begin
  select * into f from public.profiles where user_id = p_user_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  if p_birth_date is null or p_birth_date < date '1940-01-01' or p_birth_date > (now() - interval '5 years')::date
    or p_guardian_name is null or char_length(btrim(p_guardian_name)) not between 2 and 80
    or p_contact_hash is null or p_contact_hash !~ '^[0-9a-f]{64}$'
    or p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$'
    or p_contact_masked is null or char_length(p_contact_masked) not between 3 and 120
    or p_ttl_hours is null or p_ttl_hours not between 1 and 168 then
    return jsonb_build_object('error', 'validation');
  end if;
  -- only the change the account cannot make itself comes here
  if public.age_status(f.birth_date, f.birth_year, f.timezone) <> 'minor'
    or public.age_status(p_birth_date, null, f.timezone) <> 'adult' then
    return jsonb_build_object('error', 'not_required');
  end if;
  if f.birth_date_corrections >= public.birth_date_corrections_max() then return jsonb_build_object('error', 'correction_limit'); end if;
  -- a guardian who has answered a link outranks an address the account merely sent a request to afterwards
  select guardian_contact_hash into known from public.guardian_consents
    where user_id = p_user_id and delivery_status = 'sent'
    order by (verified_at is not null or declined_at is not null) desc, requested_at desc limit 1;
  if known is not null and known <> p_contact_hash then return jsonb_build_object('error', 'guardian_mismatch'); end if;
  if (select count(*) from public.birth_date_corrections
      where user_id = p_user_id and requested_at > now() - interval '24 hours') >= 3 then
    return jsonb_build_object('error', 'rate_limited');
  end if;

  update public.birth_date_corrections set status = 'superseded', token_hash = null where user_id = p_user_id and status = 'pending';
  expires := now() + p_ttl_hours * interval '1 hour';
  insert into public.birth_date_corrections
    (user_id, new_birth_date, guardian_name, guardian_contact_hash, guardian_contact_masked, token_hash, token_expires_at)
    values (p_user_id, p_birth_date, btrim(p_guardian_name), p_contact_hash, p_contact_masked, p_token_hash, expires)
    returning id into request_id;
  insert into public.audit_log (actor_id, action, target_type, target_id)
    values (p_user_id, 'birth_date_correction_requested', 'birth_date_correction', request_id);
  return jsonb_build_object('id', request_id, 'expires_at', expires);
end;
$$;
revoke all on function public.create_birth_date_correction(uuid, date, text, text, text, text, integer)
  from public, anon, authenticated, service_role;
grant execute on function public.create_birth_date_correction(uuid, date, text, text, text, text, integer) to service_role;

create function public.record_birth_date_correction_delivery(p_id uuid, p_sent boolean, p_ref text default null)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
begin
  if p_sent is null then return jsonb_build_object('error', 'validation'); end if;
  update public.birth_date_corrections set
      delivery_status = case when p_sent then 'sent' else 'failed' end,
      delivered_at = case when p_sent then now() end,
      delivery_ref = left(p_ref, 200)
    where id = p_id and status = 'pending' and delivery_status = 'queued';
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('delivery_status', case when p_sent then 'sent' else 'failed' end);
end;
$$;
revoke all on function public.record_birth_date_correction_delivery(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.record_birth_date_correction_delivery(uuid, boolean, text) to service_role;

-- The parent/guardian's answer to a correction. Single-use; the date changes only on a yes.
create function public.confirm_birth_date_correction(p_token_hash text, p_approve boolean, p_verifier_name text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  k public.birth_date_corrections;
  f public.profiles;
  old_age text;
begin
  if p_token_hash is null or p_approve is null
    or (p_approve and (p_verifier_name is null or char_length(btrim(p_verifier_name)) not between 2 and 80)) then
    return jsonb_build_object('error', 'validation');
  end if;
  select * into f from public.profiles
    where user_id = (select user_id from public.birth_date_corrections where token_hash = p_token_hash) for update;
  select * into k from public.birth_date_corrections where token_hash = p_token_hash and status = 'pending' for update;
  if not found or k.delivery_status <> 'sent' or k.token_expires_at <= now() then
    return jsonb_build_object('error', 'invalid_token');
  end if;
  if not p_approve then
    update public.birth_date_corrections set status = 'declined', decided_at = now(), token_hash = null where id = k.id;
    insert into public.audit_log (actor_type, action, target_type, target_id)
      values ('system', 'birth_date_correction_declined', 'birth_date_correction', k.id);
    return jsonb_build_object('status', 'declined');
  end if;
  if f.birth_date_corrections >= public.birth_date_corrections_max() then
    return jsonb_build_object('error', 'invalid_token');
  end if;
  old_age := public.age_status(f.birth_date, f.birth_year, f.timezone);
  update public.birth_date_corrections set status = 'applied', decided_at = now(), token_hash = null,
    verification_method = 'guardian_email_link', verifier_name = btrim(p_verifier_name),
    verifier_declaration = 'parent_or_legal_guardian' where id = k.id;
  update public.profiles set birth_date = k.new_birth_date, birth_year = extract(year from k.new_birth_date),
    birth_date_corrections = birth_date_corrections + 1, updated_at = now() where user_id = k.user_id;
  insert into public.audit_log (actor_type, action, target_type, target_id, meta)
    values ('system', 'birth_date_corrected', 'birth_date_correction', k.id,
      jsonb_build_object('from', old_age, 'to', public.account_age(k.user_id), 'by', 'guardian'));
  return jsonb_build_object('status', 'applied');
end;
$$;
revoke all on function public.confirm_birth_date_correction(text, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.confirm_birth_date_correction(text, boolean, text) to service_role;

create function public.cancel_birth_date_correction()
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  perform 1 from public.profiles where user_id = account_id for update;
  update public.birth_date_corrections set status = 'cancelled', decided_at = now(), token_hash = null
    where user_id = account_id and status = 'pending';
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  return jsonb_build_object('status', 'cancelled');
end;
$$;
revoke all on function public.cancel_birth_date_correction() from public, anon, authenticated, service_role;
grant execute on function public.cancel_birth_date_correction() to authenticated;

-- The way out when the limit is used up or no guardian can be reached: an operator, after checking by other
-- means, sets the date with the service role. It is audited and does not count against the account's limit.
create function public.set_birth_date_by_operator(p_user_id uuid, p_birth_date date, p_reason text)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  f public.profiles;
  old_age text;
begin
  if p_birth_date is null or p_birth_date < date '1940-01-01' or p_birth_date > (now() - interval '5 years')::date
    or p_reason is null or char_length(btrim(p_reason)) not between 5 and 200 then
    return jsonb_build_object('error', 'validation');
  end if;
  select * into f from public.profiles where user_id = p_user_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;
  old_age := public.age_status(f.birth_date, f.birth_year, f.timezone);
  update public.profiles set birth_date = p_birth_date, birth_year = extract(year from p_birth_date), updated_at = now()
    where user_id = p_user_id;
  update public.birth_date_corrections set status = 'superseded', token_hash = null where user_id = p_user_id and status = 'pending';
  insert into public.audit_log (actor_type, action, target_type, meta)
    values ('system', 'birth_date_corrected', 'profile',
      jsonb_build_object('from', old_age, 'to', public.account_age(p_user_id), 'by', 'operator', 'reason', btrim(p_reason)));
  perform public.apply_age_change(p_user_id, old_age);
  return jsonb_build_object('status', 'applied', 'age', public.account_age(p_user_id));
end;
$$;
revoke all on function public.set_birth_date_by_operator(uuid, date, text) from public, anon, authenticated, service_role;
grant execute on function public.set_birth_date_by_operator(uuid, date, text) to service_role;

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
    'birth_date_corrections', coalesce((select jsonb_agg(
        to_jsonb(k) - 'guardian_contact_hash' - 'token_hash' - 'delivery_ref' - 'verifier_name' order by requested_at)
      from public.birth_date_corrections k where k.user_id = account_id), '[]'::jsonb),
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
