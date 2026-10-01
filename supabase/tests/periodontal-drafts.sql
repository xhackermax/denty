-- Run after the isolated draft scenario in scripts/clinical/__tests__/perio-drafts-sql.test.ts.
do $$ begin
 if (select count(*) from public.periodontal_exams)<>1 then raise exception 'Finalization must create exactly one exam'; end if;
 if (select count(*) from public.periodontal_drafts)<>1 then raise exception 'Failed finalization must retain draft'; end if;
 if (select recession from public.periodontal_measurements limit 1)<>2 then raise exception 'Historical recession changed'; end if;
end $$;
