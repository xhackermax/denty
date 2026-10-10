-- A debt acknowledgement is a financial document, not informed treatment consent.
-- It uses the existing private clinical-documents signature evidence and document history.
begin;

create or replace function private.seed_debt_acknowledgement_template(p_clinic_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.document_templates
    (clinic_id, code, title, body, schema_json, active, version)
  values (
    p_clinic_id, 'DEBT_ACKNOWLEDGEMENT', 'Reconocimiento de deuda',
    $template$
## Identificación de las partes

Entidad acreedora: {{acreedor}}, NIF/CIF {{nif_acreedor}}.
Centro y sede: {{clinica}}, {{sede}}, {{direccion_sede}}.
Profesional responsable de la asistencia: {{doctor}}.

Paciente/deudor: {{paciente}}, DNI/NIE {{dni}}.

## Origen y cuantía del saldo

El/la firmante declara haber recibido información sobre los servicios odontológicos y/o el presupuesto indicado en este documento y reconoce un saldo pendiente de pago a favor de la entidad acreedora por un importe pendiente de **{{importe_deuda}} euros**.

Referencia del tratamiento, presupuesto o factura: {{referencia}}.
Descripción resumida de los servicios: {{concepto}}.
{{desglose}}

## Compromiso de pago

El/la firmante se compromete a abonar el saldo reconocido {{vencimiento}}, por los medios de pago admitidos por la clínica. Los pagos parciales posteriores reducirán el saldo realmente exigible. La clínica entregará el justificante de cada abono y no podrá exigir dos veces una cantidad ya satisfecha.

Este documento no establece intereses, comisiones ni penalizaciones adicionales y no implica renuncia a los derechos que correspondan legalmente al paciente. No sustituye la factura ni el consentimiento informado para actos sanitarios.

## Conformidad y firma

En {{ciudad}}, a {{fecha_larga}}, el/la paciente declara haber leído el texto completo, entendido el importe y el vencimiento, y acepta firmarlo voluntariamente.

Firmante: {{paciente}} ({{dni}}).
$template$,
    jsonb_build_object('category','FINANCIAL','signature','PATIENT','requires','patient_dni,doctor,site,amount,due_date_or_end_of_treatment'),
    true, 1
  )
  on conflict (clinic_id, code, version) do nothing;
end;
$$;
revoke all on function private.seed_debt_acknowledgement_template(uuid) from public,anon,authenticated;

create or replace function private.seed_debt_acknowledgement_on_new_clinic()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.seed_debt_acknowledgement_template(new.id);
  return new;
end;
$$;
revoke all on function private.seed_debt_acknowledgement_on_new_clinic()
from public,anon,authenticated;

drop trigger if exists clinics_seed_debt_template on public.clinics;
create trigger clinics_seed_debt_template
after insert on public.clinics for each row
execute function private.seed_debt_acknowledgement_on_new_clinic();

select private.seed_debt_acknowledgement_template(c.id) from public.clinics c;

-- Prevent generic documents and direct table clients from forging an empty
-- financial acknowledgement, and keep the signed terms immutable.
create or replace function private.guard_debt_document()
returns trigger language plpgsql security definer set search_path = '' as $
declare
  v_template_code text;
  v_kind text;
begin
  if tg_op = 'UPDATE' then
    if old.type = 'DEBT_ACKNOWLEDGEMENT'
      and old.status = 'SIGNED'
      and (new.data_json is distinct from old.data_json
        or new.template_id is distinct from old.template_id
        or new.patient_id is distinct from old.patient_id
        or new.type is distinct from old.type
        or new.title is distinct from old.title)
    then
      raise exception 'SIGNED_DEBT_TERMS_IMMUTABLE' using errcode = '42501';
    end if;
    return new;
  end if;

  select code into v_template_code from public.document_templates dt
  where dt.id = new.template_id and dt.clinic_id = new.clinic_id;

  if new.type = 'DEBT_ACKNOWLEDGEMENT'
     or v_template_code = 'DEBT_ACKNOWLEDGEMENT' then
    if new.type <> 'DEBT_ACKNOWLEDGEMENT'
       or v_template_code <> 'DEBT_ACKNOWLEDGEMENT'
       or coalesce(new.data_json ->> 'documentKind','') <> 'DEBT_ACKNOWLEDGEMENT'
       or coalesce(new.data_json ->> 'importe_deuda_centimos','') !~ '^[1-9][0-9]*

       or btrim(coalesce(new.data_json ->> 'dni','')) = ''
       or btrim(coalesce(new.data_json ->> 'nif_acreedor','')) = ''
       or btrim(coalesce(new.data_json ->> 'doctor','')) = ''
       or btrim(coalesce(new.data_json ->> 'sede','')) = ''
       or btrim(coalesce(new.data_json ->> 'vencimiento','')) = ''
    then
      raise exception 'INVALID_DEBT_ACKNOWLEDGEMENT' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$;
revoke all on function private.guard_debt_document() from public,anon,authenticated;
drop trigger if exists documents_guard_debt on public.documents;
create trigger documents_guard_debt
before insert or update on public.documents for each row
execute function private.guard_debt_document();
commit;
