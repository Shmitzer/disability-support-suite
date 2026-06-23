-- auth_hook.sql — Supabase "Custom Access Token" auth hook (Phase E, step 2).
-- Injects the signed-in user's organisationId into the JWT as a TOP-LEVEL,
-- server-controlled claim, so RLS policies can scope by org without trusting any
-- client-supplied value.
--
-- Apply BEFORE rls_policies.sql:
--     psql "$DIRECT_URL" -f prisma/sql/auth_hook.sql
-- Then, in the Supabase dashboard:
--     Authentication → Hooks → Custom Access Token →
--       enable, and select `public.custom_access_token_hook`.
--
-- WHY top-level claim, not user_metadata: `user_metadata` is user-editable and
-- can be spoofed, so it must NEVER drive authorization. The hook runs server-side
-- and Supabase signs the result, so a claim it adds is trustworthy. We avoid
-- SECURITY DEFINER (per the Supabase security checklist) and instead grant the
-- auth admin role explicit, minimal read access to Worker.

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_org  text;
begin
  -- Look up this user's org from the account row linked by supabaseUserId.
  select w."organisationId"
    into v_org
  from public."Worker" w
  where w."supabaseUserId" = (event ->> 'user_id')
  limit 1;

  claims := coalesce(event -> 'claims', '{}'::jsonb);

  if v_org is not null then
    claims := jsonb_set(claims, '{organisationId}', to_jsonb(v_org));
  else
    -- Solo worker (no org): make sure no stale org claim lingers.
    claims := claims - 'organisationId';
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- The hook is executed by the auth server as `supabase_auth_admin`. Grant it
-- exactly what it needs and nothing more; keep it away from clients.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- The hook must read Worker, which has RLS enabled (rls_policies.sql). Give the
-- auth admin a narrow read-only grant + policy so the lookup succeeds.
grant select on public."Worker" to supabase_auth_admin;
drop policy if exists auth_admin_read_worker on public."Worker";
create policy auth_admin_read_worker on public."Worker"
  as permissive for select to supabase_auth_admin
  using (true);
