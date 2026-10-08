-- Matches the hardened RPC privileges applied to Denty Supabase on 2026-10-08.
-- Supabase may add explicit EXECUTE grants for anon through default privileges;
-- revoking PUBLIC alone does not remove an explicit anon grant.
revoke execute on function public.delete_draft_budget(uuid,uuid,integer) from anon;
revoke execute on function public.update_draft_budget(uuid,uuid,integer,text,jsonb) from anon;
notify pgrst, 'reload schema';
