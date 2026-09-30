-- DraftMyForms database security fixes.
-- Review, then run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run more than once. Server code uses the service-role key, which bypasses RLS,
-- so none of this affects the API functions.

-- Admin account (matches ADMIN_EMAILS in lib/auth.js).
create or replace function public.dmf_is_admin() returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'larrywomack40@gmail.com'
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Profiles: browsers must not be able to give themselves a plan, admin role or credits.
--    Anyone signed in could otherwise run sb.from('profiles').update({plan:'business'}).
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists trial_used boolean default false;

create or replace function public.dmf_protect_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
begin
  -- Server code (service role), the SQL editor (no JWT) and the admin may change anything.
  if jwt_role in ('service_role', '') or public.dmf_is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'customer';
    new.plan := 'free';
    new.plan_override := null;
    new.ai_credits_used := 0;
    new.ai_credits_limit := null;
    new.stripe_customer_id := null;
    new.stripe_subscription_id := null;
    new.trial_used := false;
  else
    new.role := old.role;
    new.plan := old.plan;
    new.plan_override := old.plan_override;
    new.ai_credits_used := old.ai_credits_used;
    new.ai_credits_limit := old.ai_credits_limit;
    new.ai_credits_reset_at := old.ai_credits_reset_at;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.trial_used := old.trial_used;
  end if;
  return new;
end $$;

drop trigger if exists dmf_protect_profile on public.profiles;
create trigger dmf_protect_profile before insert or update on public.profiles
  for each row execute function public.dmf_protect_profile();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Tables that anyone with the public anon key can currently read.
--    Existing policies on these tables are replaced.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  pol record;
begin
  foreach t in array array['temp_access_tokens', 'visitor_sessions', 'email_leads', 'user_events', 'user_preferences'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('alter table public.%I enable row level security', t);
    for pol in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;
  end loop;
end $$;

-- Admin panel reads and manages these with the admin's own login.
do $$
declare t text;
begin
  foreach t in array array['temp_access_tokens', 'visitor_sessions', 'email_leads', 'user_events'] loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format('create policy dmf_admin_all on public.%I for all to authenticated using (public.dmf_is_admin()) with check (public.dmf_is_admin())', t);
  end loop;
end $$;

-- Each user sees and edits only their own saved preferences.
create policy dmf_own_rows on public.user_preferences for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Guest links: the editor redeems one token at a time through this function instead of reading
-- the whole table. It also enforces max_uses, which the old browser code never did.
create or replace function public.redeem_access_token(p_token text)
returns setof public.temp_access_tokens
language plpgsql security definer set search_path = public as $$
begin
  return query
    update public.temp_access_tokens
       set used_count = coalesce(used_count, 0) + 1
     where token = p_token
       and is_active
       and expires_at > now()
       and (max_uses is null or coalesce(used_count, 0) < max_uses)
    returning *;
end $$;
revoke all on function public.redeem_access_token(text) from public;
grant execute on function public.redeem_access_token(text) to anon, authenticated;
