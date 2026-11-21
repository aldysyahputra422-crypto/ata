-- Atomic redeem, audited exports, and deletion bookkeeping.
create function public.redeem_code(code text, request_key uuid default null)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  at_time timestamptz;
  normalized text;
  invitation public.redeem_codes%rowtype;
  grant_id uuid;
  expiration timestamptz;
  result jsonb;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(account_id::text, 1));
  at_time := clock_timestamp();
  delete from public.redeem_requests
    where user_id = account_id and created_at <= at_time - interval '24 hours';

  if request_key is not null then
    select r.result into result from public.redeem_requests r
      where r.user_id = account_id and r.idempotency_key = request_key;
    if found then
      return result;
    end if;
  end if;

  if (select count(*) from public.redeem_requests
      where user_id = account_id and created_at > at_time - interval '15 minutes') >= 10 then
    return jsonb_build_object('error', 'rate_limited');
  end if;

  if char_length(code) <= 64 then
    normalized := upper(regexp_replace(code, '[^a-zA-Z0-9]', '', 'g'));
  end if;
  if char_length(normalized) between 6 and 40 then
    select * into invitation from public.redeem_codes
      where code_hash = encode(sha256(convert_to(normalized, 'UTF8')), 'hex')
      for update;
  end if;

  -- Recheck the time after waiting for the shared code lock.
  at_time := clock_timestamp();
  if invitation.id is null or not invitation.active or invitation.valid_until <= at_time then
    result := jsonb_build_object('error', 'invalid_code');
  elsif invitation.one_per_user and exists (
    select 1 from public.redemptions where code_id = invitation.id and user_id = account_id
  ) then
    result := jsonb_build_object('error', 'already_redeemed');
  elsif invitation.used >= invitation.max_uses then
    result := jsonb_build_object('error', 'invalid_code');
  else
    expiration := at_time + invitation.days_granted * interval '24 hours';
    update public.redeem_codes set used = used + 1 where id = invitation.id;
    insert into public.entitlements (user_id, source, source_ref, starts_at, ends_at)
      values (account_id, 'redeem', invitation.id, at_time, expiration)
      returning id into grant_id;
    insert into public.redemptions (user_id, code_id, entitlement_id, one_per_user)
      values (account_id, invitation.id, grant_id, invitation.one_per_user);
    insert into public.audit_log (actor_id, action, target_type)
      values (account_id, 'redeem', 'entitlement');
    result := jsonb_build_object(
      'entitlement', jsonb_build_object('plan', 'pro', 'ends_at', expiration),
      'days', invitation.days_granted
    );
  end if;

  insert into public.redeem_requests (user_id, idempotency_key, result, created_at)
    values (account_id, request_key, result, at_time);
  return result;
end;
$$;
revoke all on function public.redeem_code(text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.redeem_code(text, uuid) to authenticated;

create function public.export_account_data()
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
      from public.redemptions r where r.user_id = account_id), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.export_account_data() from public, anon, authenticated, service_role;
grant execute on function public.export_account_data() to authenticated;

create function public.audit_account_deletion()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- Retain the event without a reference to the deleted identity.
  insert into public.audit_log (action, target_type) values ('account_deleted', 'account');
  return old;
end;
$$;
revoke all on function public.audit_account_deletion() from public, anon, authenticated, service_role;

create trigger ata_audit_account_deletion
  after delete on auth.users for each row execute function public.audit_account_deletion();
