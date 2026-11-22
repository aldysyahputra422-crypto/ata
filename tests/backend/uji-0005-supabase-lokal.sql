-- Manual check of migrations 0004 and 0005 against a LOCAL Supabase Postgres (real auth schema, real roles), never a remote project.
-- Everything runs in one transaction that is rolled back, so the local database is left unchanged.
-- Run: docker cp the two migration files to /tmp/0004.sql and /tmp/0005.sql in the supabase_db container, then
--      docker exec <container> psql -U postgres -d postgres -qAt -f /tmp/uji.sql
-- Expected output is recorded in docs/gerbang-m1-lomba.md.
\set ON_ERROR_STOP 1
begin;
\i /tmp/0004.sql
\i /tmp/0005.sql
insert into auth.users (id) values ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa'),('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb');
insert into auth.sessions (id, user_id, created_at, updated_at) values ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',now(),now()),('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002','bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',now(),now());
insert into public.entitlements (user_id, source, ends_at) values ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','grant', now() + interval '30 days');
select plan, "limit" from public.plan_features where feature='activeSlots' order by plan;
select relrowsecurity as rls from pg_class where oid='public.user_competitions'::regclass;
create function pg_temp.coba(q text) returns text language plpgsql as $f$ begin execute q; return 'ok'; exception when others then return sqlstate || ' ' || sqlerrm; end $f$;
-- Free
select set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa","session_id":"aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaa0001","role":"authenticated"}',false);
set role authenticated;
select 'free slot 1' t, pg_temp.coba($$insert into public.user_competitions (competition_key,state) values ('a','slot')$$);
select 'free slot 2 (expect reject)' t, pg_temp.coba($$insert into public.user_competitions (competition_key,state) values ('b','slot')$$);
select 'free saved' t, pg_temp.coba($$insert into public.user_competitions (competition_key,state) values ('b','saved')$$);
select 'free saved->slot (expect reject)' t, pg_temp.coba($$update public.user_competitions set state='slot' where competition_key='b'$$);
select 'free edit active slot roadmap' t, pg_temp.coba($$update public.user_competitions set roadmap='{"x":1}' where competition_key='a'$$);
select 'free forge user_id (expect reject)' t, pg_temp.coba($$insert into public.user_competitions (user_id,competition_key,state) values ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','z','saved')$$);
-- Pro
reset role;
select set_config('request.jwt.claims','{"sub":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb","session_id":"bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbb0002","role":"authenticated"}',false);
set role authenticated;
select 'pro sees rows of free (expect 0)' t, count(*)::text from public.user_competitions;
select 'pro slot '||k t, pg_temp.coba(format($$insert into public.user_competitions (competition_key,state) values ('p%s','slot')$$,k)) from generate_series(1,4) k;
-- downgrade: Pro entitlement ends, 3 slots stay and stay editable
reset role;
update public.entitlements set ends_at = now() - interval '1 second', starts_at = now() - interval '2 days' where user_id='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
set role authenticated;
select 'after downgrade: slots kept' t, count(*)::text from public.user_competitions where state='slot';
select 'after downgrade: edit slot' t, pg_temp.coba($$update public.user_competitions set roadmap='{"y":2}' where competition_key='p1'$$);
select 'after downgrade: new slot (expect reject)' t, pg_temp.coba($$insert into public.user_competitions (competition_key,state) values ('p9','slot')$$);
select 'after downgrade: release one' t, pg_temp.coba($$update public.user_competitions set state='released' where competition_key='p3'$$);
select 'after downgrade: re-activate (expect reject, 2 >= 1)' t, pg_temp.coba($$update public.user_competitions set state='slot' where competition_key='p3'$$);
reset role;
set role anon;
select 'anon select (expect denied)' t, pg_temp.coba($$select 1 from public.user_competitions$$);
reset role;
rollback;
select 'after rollback' t, to_regclass('public.user_competitions') is null as table_absent, (select string_agg(version,',' order by version) from supabase_migrations.schema_migrations) migrations, (select count(*) from auth.users) users;
