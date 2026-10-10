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
commit;
