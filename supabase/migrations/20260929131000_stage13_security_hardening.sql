-- Stage 13 — security hardening after the fresh rebuild (Supabase advisors).
-- 1. No SECURITY DEFINER function in the exposed schema is callable without login.
-- 2. btree_gist lives in the extensions schema, not in public.
-- Signed-in callers keep EXECUTE: every RPC validates clinic membership/permissions
-- inside the function (see Stage 2 contract), which is the intended design.
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from anon, public', f.signature);
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'btree_gist' and n.nspname = 'public'
  ) then
    execute 'create schema if not exists extensions';
    execute 'alter extension btree_gist set schema extensions';
  end if;
end;
$$;
