-- Rollback of 0009_tanya_ata.sql. Not a migration: run by hand only when 0009 has to be undone.
-- Removes every object 0009 created and nothing else. Data lost: stored (encrypted) AI keys, request counters and
-- the Tanya Ata run records. No table from migrations 0001-0008 is changed; the one trigger
-- 0009 put on public.guardian_consents (0008) is removed again. Rows that 0009's functions wrote to
-- public.audit_log (ai_connection_create / ai_connection_delete) are kept: they are audit history.
begin;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('ai-credentials-purge');
  end if;
exception when others then
  raise notice 'ai-credentials-purge was not unscheduled: %', sqlerrm;
end;
$$;

drop trigger if exists ai_credentials_consent_end on public.guardian_consents;
drop function if exists public.ai_credentials_drop_on_consent_end();
drop function if exists public.tanya_run_finish(uuid, text, text, integer, integer);
drop function if exists public.tanya_run_start(text, text, text, text, text[], jsonb, jsonb);
drop function if exists public.ai_take_test();
drop function if exists public.ai_take_request();
drop function if exists public.ai_credential_delete();
drop function if exists public.ai_credential_get(boolean);
drop function if exists public.ai_credential_put(uuid, text, text, text, text, integer, text, text, text, text, bigint);
drop function if exists public.ai_credential_begin();
drop function if exists public.ai_credentials_purge();
drop function if exists public.ai_credential_session();

drop table if exists public.tanya_runs;
drop table if exists public.ai_request_counters;
drop table if exists public.ai_credentials;

commit;
