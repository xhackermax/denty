-- Isolated fixture only: run after the generation/finish retry scenario, never against live patient data.
do $$ begin
 if (select count(*) from public.periodontal_draft_completions)<>1 then
  raise exception 'Completion retry must reuse one examination';
 end if;
 if (select count(*) from public.periodontal_drafts)<>1 then
  raise exception 'Stale generation must preserve the new draft';
 end if;
 if not exists(select 1 from public.periodontal_drafts where draft_id is not null and version=1) then
  raise exception 'New draft requires a fresh generation at revision one';
 end if;
 if (select probing_depth from public.periodontal_measurements limit 1)<>4 then
  raise exception 'Completion retry changed the saved examination';
 end if;
end $$;
