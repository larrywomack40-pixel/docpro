-- DraftMyForms database security fixes, PHASE 2 (DRAFT, do not run until reviewed).
-- Companion to supabase/security-fixes.sql (phase 1, applied 2026-10-22).
-- Covers the six tables phase 1 did not touch, the "RLS Policy Always True" warnings on
-- generated_documents and url_clicks, and notes options for the url_clicks_summary view.
--
-- How each decision was made: every table below was traced through the repo code
-- (larrywomack40-pixel/docpro, main @ d7e8d2b, searched 2026-10-22). "Browser" means the
-- supabase-js client built with SUPABASE_ANON_KEY in the public pages (e.g. index.html
-- line 608: window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)), which runs as
-- the anon or authenticated role and IS subject to RLS. "Server" means the Vercel API
-- functions, which use SUPABASE_SERVICE_ROLE_KEY; the service role bypasses RLS entirely,
-- so locking a server-only table down with no browser policies cannot break the API.
--
-- Safe to run more than once. Run in Supabase: SQL Editor -> New query -> paste -> Run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Make sure the phase-1 admin helper exists (phase 1 already created it;
--    this is a no-op safeguard so phase 2 can be reviewed on its own).
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.dmf_is_admin() returns boolean
language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'larrywomack40@gmail.com'
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. document_history: SERVER ONLY, enable RLS, no browser policies.
--    Evidence: api/ai-generate.js line 538 inserts via supabaseAdmin
--    (createClient with SUPABASE_SERVICE_ROLE_KEY, line 300); api/admin-api.js
--    lines 36-37, 52, 63, 137 read it with a service-role client (lines 3-5);
--    api/cron.js line 25 reads it with a service-role client (line 19).
--    No browser file references this table (repo-wide search, 2026-10-22).
--    The admin panel reaches it through /api/admin-api, so the admin keeps full
--    access after this change.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.document_history enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. document_styles: NO CODE REFERENCES IT, enable RLS, no browser policies.
--    Evidence: repo-wide search for "document_styles" on 2026-10-22 returned
--    zero matches in any .js or .html file. No live feature in this codebase
--    reads or writes it, so enabling RLS with no policies cannot break the
--    site. If some outside tool uses it with the anon key, that tool will get
--    empty results after this runs and a scoped policy can be added then.
--    Server code with the service-role key is unaffected either way.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.document_styles enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. referral_rewards: SERVER ONLY, enable RLS, no browser policies.
--    Evidence: the only references are in api/webhook.js lines 151 and 158
--    (Stripe webhook crediting referral rewards), and that file's client is
--    adminClient() from lib/auth.js, which is built with
--    SUPABASE_SERVICE_ROLE_KEY (lib/auth.js lines 10-12).
--    Note: the separate public.referrals table IS used by browser code and is
--    not flagged by the advisor; it is deliberately not touched here.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.referral_rewards enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Training pipeline tables: SERVER ONLY, enable RLS, no browser policies.
--    golden_samples, training_evaluations, training_runs.
--    Evidence: the only references are in api/cron.js (golden_samples lines 76,
--    98, 107, 139, 157; training_evaluations line 63; training_runs lines 93,
--    124), and both clients in that file are built with
--    SUPABASE_SERVICE_ROLE_KEY (lines 19 and 119). No browser file references
--    any of the three tables.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.golden_samples enable row level security;
alter table public.training_evaluations enable row level security;
alter table public.training_runs enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. generated_documents: replace the always-true policies.
--    Evidence: written and read only by server code. api/docs.js inserts at
--    line 104 and reads history at line 129, with a client built from
--    SUPABASE_SERVICE_ROLE_KEY (api/docs.js lines 7-10). The dashboard's
--    "My Documents / history" screen does not query this table from the
--    browser; it calls GET /api/docs/user-history instead. No browser file
--    references generated_documents.
--    Narrowest policy the code supports: none for browser roles. The always-
--    true policies are dropped and nothing replaces them, so the anon and
--    authenticated roles get no access at all; the service role bypasses RLS
--    and the API keeps working exactly as before.
--    Optional, only if a future feature ever reads this table directly from
--    the browser: uncomment the own-rows policy below (same auth.uid() pattern
--    phase 1 used for user_preferences). Do not enable it speculatively.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  pol record;
begin
  if to_regclass('public.generated_documents') is not null then
    execute 'alter table public.generated_documents enable row level security';
    for pol in select policyname from pg_policies
               where schemaname = 'public' and tablename = 'generated_documents' loop
      execute format('drop policy %I on public.generated_documents', pol.policyname);
    end loop;
  end if;
end $$;

-- create policy dmf_own_rows on public.generated_documents for select to authenticated
--   using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. url_clicks: narrow the always-true policy to INSERT ONLY for browsers.
--    Evidence: one live browser feature writes this table and must keep
--    working: the page-view tracker in index.html (around line 923) runs
--    sb.from('url_clicks').insert({ url, page_title, referrer, ip_hash })
--    with the anon-key client, for signed-out and signed-in visitors alike.
--    Anonymous page-view capture cannot be scoped to a row owner by design:
--    there is no user to scope to. A permissive WITH CHECK on INSERT is
--    therefore genuinely required, narrowed here to require a url value.
--    The actual exposure in the current always-true FOR ALL policy is READS:
--    anyone with the public anon key can currently select the whole click
--    log. Reads only happen server-side (api/admin-api.js lines 99-101 reads
--    the url_clicks_summary view with a service-role client), so this change
--    drops every existing policy and grants browsers insert and nothing else:
--    no select, no update, no delete policies for anon or authenticated.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  pol record;
begin
  if to_regclass('public.url_clicks') is not null then
    execute 'alter table public.url_clicks enable row level security';
    for pol in select policyname from pg_policies
               where schemaname = 'public' and tablename = 'url_clicks' loop
      execute format('drop policy %I on public.url_clicks', pol.policyname);
    end loop;
    execute 'create policy dmf_click_insert on public.url_clicks for insert to anon, authenticated with check (url is not null)';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. url_clicks_summary: Security Definer View warning. NOT FIXED by this
--    script, on purpose: the right fix depends on a decision, and both
--    options are safe because the view's only reader in the codebase is
--    api/admin-api.js (lines 99-101), which connects with the service role.
--    Background: a Postgres view runs with its owner's privileges, so anyone
--    granted select on the view bypasses the RLS set on url_clicks above.
--    Option A (recommended, smallest change): revoke browser access to the
--    view and leave everything else alone. The admin panel reads it through
--    /api/admin-api with the service role, which is unaffected by the revoke.
--      revoke select on public.url_clicks_summary from anon, authenticated;
--    Option B (Postgres 15+): rebuild the view with security_invoker = true
--    so it runs with the CALLER's privileges and the url_clicks policies
--    apply. Under phase 2, browser roles have no select policy on url_clicks,
--    so the view would return nothing to browsers either way; the service
--    role still bypasses and the admin API still works.
--      alter view public.url_clicks_summary set (security_invoker = true);
--    A and B can be combined. Pick one (or both) in the dashboard pass; the
--    advisor warning clears when browser roles can no longer read through
--    the view with owner privileges.
-- ─────────────────────────────────────────────────────────────────────────────

-- After running: Supabase Dashboard -> Advisors -> Security should show none of
-- document_history, document_styles, referral_rewards, golden_samples,
-- training_evaluations, training_runs as RLS-disabled, and no always-true policy
-- warnings for generated_documents or url_clicks. The url_clicks_summary view
-- warning remains until one of the section 7 options is applied.
