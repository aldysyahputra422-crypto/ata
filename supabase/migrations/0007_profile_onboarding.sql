-- Profile, onboarding and AI data permissions written by the account itself (FR-AUTH-04, FR-AUTH-09).
-- Clients still have no table write grants: every change goes through these functions, which accept
-- a fixed set of fields and validate them, so a direct PostgREST call cannot store anything else.

alter table public.profiles
  add column display_name text check (char_length(display_name) between 2 and 30),
  add column targets text[] not null default '{}',
  add column skills text[] not null default '{}';

-- A JSON array of short, distinct, non-empty strings, or null when it is anything else.
create function public.profile_text_list(p_value jsonb, p_max_items integer, p_max_length integer)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  items text[];
begin
  if p_value is null or jsonb_typeof(p_value) <> 'array' then return null; end if;
  if exists (select 1 from jsonb_array_elements(p_value) e where jsonb_typeof(e) <> 'string') then return null; end if;
  select coalesce(array_agg(v order by first), '{}') into items
    from (select btrim(value) as v, min(ordinality) as first
          from jsonb_array_elements_text(p_value) with ordinality group by btrim(value)) t;
  if cardinality(items) > p_max_items then return null; end if;
  if exists (select 1 from unnest(items) v where char_length(v) = 0 or char_length(v) > p_max_length) then return null; end if;
  return items;
end;
$$;
revoke all on function public.profile_text_list(jsonb, integer, integer) from public, anon, authenticated, service_role;

create function public.update_profile(p_patch jsonb)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  allowed constant text[] := array['display_name', 'jenjang', 'birth_year', 'institution', 'major', 'timezone',
    'interests', 'targets', 'skills', 'goals_text', 'weekly_hours'];
  field text;
  value jsonb;
  kind text;
  list text[];
  number_value numeric;
  row public.profiles;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then return jsonb_build_object('error', 'validation'); end if;

  select * into row from public.profiles where user_id = account_id for update;
  if not found then return jsonb_build_object('error', 'not_found'); end if;

  for field, value in select key, jsonb_each.value from jsonb_each(p_patch) loop
    kind := jsonb_typeof(value);
    if not field = any (allowed) then return jsonb_build_object('error', 'validation', 'field', field); end if;

    if field in ('display_name', 'jenjang', 'institution', 'major', 'timezone', 'goals_text') then
      if kind not in ('string', 'null') then return jsonb_build_object('error', 'validation', 'field', field); end if;
      value := coalesce(to_jsonb(nullif(btrim(value #>> '{}'), '')), 'null'::jsonb);
      kind := jsonb_typeof(value);
      if kind = 'string' and (
        (field = 'display_name' and char_length(value #>> '{}') not between 2 and 30)
        or (field = 'jenjang' and (value #>> '{}') not in ('SMP', 'SMA/SMK', 'Kuliah D3–S1', 'Lainnya'))
        or (field in ('institution', 'major') and char_length(value #>> '{}') > 120)
        or (field = 'goals_text' and char_length(value #>> '{}') > 280)
        or (field = 'timezone' and not exists (select 1 from pg_catalog.pg_timezone_names where name = value #>> '{}'))
      ) then return jsonb_build_object('error', 'validation', 'field', field); end if;
      -- A finished onboarding keeps its required answers.
      if kind = 'null' and row.onboarding_done and field in ('display_name', 'jenjang') then
        return jsonb_build_object('error', 'validation', 'field', field);
      end if;
      case field
        when 'display_name' then row.display_name := value #>> '{}';
        when 'jenjang' then row.jenjang := value #>> '{}';
        when 'institution' then row.institution := value #>> '{}';
        when 'major' then row.major := value #>> '{}';
        when 'timezone' then row.timezone := value #>> '{}';
        else row.goals_text := value #>> '{}';
      end case;

    elsif field in ('birth_year', 'weekly_hours') then
      if kind = 'null' then
        if field = 'birth_year' and row.onboarding_done then return jsonb_build_object('error', 'validation', 'field', field); end if;
        number_value := null;
      elsif kind = 'number' then
        number_value := (value #>> '{}')::numeric;
        if number_value <> trunc(number_value)
          or (field = 'birth_year' and number_value not between 1940 and extract(year from now()) - 5)
          or (field = 'weekly_hours' and number_value not between 0 and 80)
        then return jsonb_build_object('error', 'validation', 'field', field); end if;
      else
        return jsonb_build_object('error', 'validation', 'field', field);
      end if;
      if field = 'birth_year' then row.birth_year := number_value; else row.weekly_hours := number_value; end if;

    else
      list := public.profile_text_list(value, case field when 'interests' then 5 when 'targets' then 6 else 10 end, 40);
      if list is null then return jsonb_build_object('error', 'validation', 'field', field); end if;
      case field
        when 'interests' then row.interests := list;
        when 'targets' then row.targets := list;
        else row.skills := list;
      end case;
    end if;
  end loop;

  update public.profiles set
    display_name = row.display_name, jenjang = row.jenjang, birth_year = row.birth_year, institution = row.institution,
    major = row.major, timezone = row.timezone, interests = row.interests, targets = row.targets, skills = row.skills,
    goals_text = row.goals_text, weekly_hours = row.weekly_hours, updated_at = now()
  where user_id = account_id
  returning * into row;
  return jsonb_build_object('profile', to_jsonb(row));
end;
$$;
revoke all on function public.update_profile(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.update_profile(jsonb) to authenticated;

-- Onboarding is done once the required answers exist. Calling it again changes nothing.
create function public.complete_onboarding()
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
revoke all on function public.complete_onboarding() from public, anon, authenticated, service_role;
grant execute on function public.complete_onboarding() to authenticated;

-- One data category on or off for AI use. Every category starts off (0002); each change is audited.
create function public.set_ai_permission(p_category text, p_allowed boolean)
returns jsonb
language plpgsql
security definer set search_path = ''
as $$
declare
  account_id uuid := auth.uid();
  current_value boolean;
  result jsonb;
begin
  if account_id is null or not public.account_session_active() then
    raise insufficient_privilege using message = 'authentication required';
  end if;
  if p_allowed is null or p_category is null or not p_category = any
    (array['profil', 'akademik', 'lomba', 'tugas', 'progres', 'evaluasi', 'ingatan', 'dokumen']) then
    return jsonb_build_object('error', 'validation');
  end if;

  select coalesce((categories ->> p_category)::boolean, false) into current_value
    from public.ai_permissions where user_id = account_id for update;
  if not found then
    insert into public.ai_permissions (user_id) values (account_id);
    current_value := false;
  end if;
  if current_value is distinct from p_allowed then
    update public.ai_permissions
      set categories = jsonb_set(categories, array[p_category], to_jsonb(p_allowed)), updated_at = now()
      where user_id = account_id;
    insert into public.audit_log (actor_id, action, target_type, meta)
      values (account_id, 'ai_permission_change', 'ai_permissions', jsonb_build_object('category', p_category, 'allowed', p_allowed));
  end if;
  select jsonb_build_object('categories', categories, 'updated_at', updated_at, 'changed', current_value is distinct from p_allowed)
    into result from public.ai_permissions where user_id = account_id;
  return result;
end;
$$;
revoke all on function public.set_ai_permission(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.set_ai_permission(text, boolean) to authenticated;
