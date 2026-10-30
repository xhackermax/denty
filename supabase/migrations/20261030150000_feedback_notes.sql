-- Feedback inbox: anyone on the clinic staff who tries the app can leave a note about
-- something that fails or could be better. Every staff member reads the whole inbox so
-- the same issue is not reported twice; only admins move a note through its statuses.
begin;
create table if not exists public.feedback_notes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null default 'IDEA' check (kind in ('BUG','IDEA','OTHER')),
  message text not null check (char_length(btrim(message)) between 3 and 4000),
  page_path text check (page_path is null or char_length(page_path) <= 300),
  status text not null default 'NEW' check (status in ('NEW','REVIEWED','DONE','DISMISSED')),
  author_id uuid references public.profiles(id) on delete set null,
  -- Snapshot of the author's name: other staff cannot read each other's profiles.
  author_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists feedback_notes_clinic_created_idx on public.feedback_notes(clinic_id,created_at desc);
create index if not exists feedback_notes_author_idx on public.feedback_notes(author_id);

alter table public.feedback_notes enable row level security;
revoke all on public.feedback_notes from anon;
revoke insert,update,delete on public.feedback_notes from authenticated;
grant select on public.feedback_notes to authenticated;
create policy feedback_notes_staff_read on public.feedback_notes for select to authenticated
  using ((select private.is_clinic_staff(clinic_id)));

create or replace function public.create_feedback_note(
  p_clinic_id uuid,
  p_kind text,
  p_message text,
  p_page_path text default null
) returns public.feedback_notes
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.feedback_notes%rowtype;
  v_name text;
begin
  if not (select private.is_clinic_staff(p_clinic_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select coalesce(nullif(btrim(p.first_name || ' ' || p.last_name), ''), p.email, 'Usuario')
    into v_name
    from public.profiles p
    where p.id = (select auth.uid());
  insert into public.feedback_notes(clinic_id, kind, message, page_path, author_id, author_name)
  values (p_clinic_id, p_kind, btrim(p_message), nullif(btrim(p_page_path), ''),
          (select auth.uid()), coalesce(v_name, 'Usuario'))
  returning * into r;
  return r;
end $$;

create or replace function public.update_feedback_note_status(p_note_id uuid, p_status text)
returns public.feedback_notes
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.feedback_notes%rowtype;
begin
  select * into r from public.feedback_notes where id = p_note_id for update;
  if r.id is null then raise exception 'FEEDBACK_NOTE_NOT_FOUND' using errcode = 'P0002'; end if;
  if not (select private.is_clinic_admin(r.clinic_id)) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  update public.feedback_notes set status = p_status, updated_at = now()
    where id = p_note_id returning * into r;
  return r;
end $$;

revoke all on function public.create_feedback_note(uuid,text,text,text), public.update_feedback_note_status(uuid,text) from public, anon;
grant execute on function public.create_feedback_note(uuid,text,text,text), public.update_feedback_note_status(uuid,text) to authenticated;
commit;
