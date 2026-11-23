-- Rollback of 0008_guardian_consent.sql (FR-AUTH-07). Not a migration: run by hand, only if 0008 must be undone.
-- It restores the functions of 0006/0007 and removes everything 0008 added.
-- What it cannot give back:
--   * consent records, correction records and full birth dates are dropped (the birth year stays);
--   * AI permissions that 0008 switched off and onboarding flags it reopened stay as they are;
--   * after it, a minor can again finish onboarding and enable AI permissions without consent (the bug 0008 fixes).
begin;

drop trigger if exists ata_enforce_ai_permission_consent on public.ai_permissions;

drop function public.set_ai_permission(text, boolean);
alter function public.set_ai_permission_unchecked(text, boolean) rename to set_ai_permission;
grant execute on function public.set_ai_permission(text, boolean) to authenticated;

drop function public.update_profile(jsonb);
alter function public.update_profile_unchecked(jsonb) rename to update_profile;
grant execute on function public.update_profile(jsonb) to authenticated;

-- complete_onboarding as in 0007
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
  if not row.onboarding_done then
    update public.profiles set onboarding_done = true, updated_at = now() where user_id = account_id;
  end if;
  return jsonb_build_object('done', true);
end;
$$;

-- export_account_data as in 0006
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

drop table if exists public.birth_date_corrections;
drop table if exists public.guardian_consents;
alter table public.profiles drop column if exists birth_date, drop column if exists birth_date_corrections;

drop function if exists public.account_age(uuid);
drop function if exists public.age_status(date, numeric, text, timestamptz);
drop function if exists public.ai_categories();
drop function if exists public.ai_processing_gate(uuid, text);
drop function if exists public.apply_age_change(uuid, text);
drop function if exists public.birth_date_corrections_max();
drop function if exists public.can_process_ai(text);
drop function if exists public.cancel_birth_date_correction();
drop function if exists public.confirm_birth_date_correction(text, boolean, text);
drop function if exists public.confirm_guardian_consent(text, boolean, text, text, boolean);
drop function if exists public.create_birth_date_correction(uuid, date, text, text, text, text, integer);
drop function if exists public.create_guardian_consent_request(uuid, text, text, text, text, text, integer);
drop function if exists public.end_guardian_consent(uuid, uuid, text);
drop function if exists public.enforce_ai_permission_consent();
drop function if exists public.guardian_consent_lookup(text);
drop function if exists public.guardian_consent_status();
drop function if exists public.guardian_consent_verified(uuid, text);
drop function if exists public.purge_guardian_requested_deletions();
drop function if exists public.record_birth_date_correction_delivery(uuid, boolean, text);
drop function if exists public.record_guardian_consent_delivery(uuid, boolean, text);
drop function if exists public.reset_ai_permissions(uuid, text);
drop function if exists public.revoke_guardian_consent();
drop function if exists public.set_birth_date_by_operator(uuid, date, text);
drop function if exists public.withdraw_guardian_consent(text);

commit;
