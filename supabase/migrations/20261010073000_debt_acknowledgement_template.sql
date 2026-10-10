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
  -- Privacy notice v2 explicitly acknowledges receipt, NOT consent for clinical data.
  -- The clinic's controller and contact data are captured in the document snapshot.
  insert into public.document_templates
    (clinic_id, code, title, body, schema_json, active, version)
  values (
    p_clinic_id, 'DATA_PROTECTION',
    'Información de protección de datos (RGPD): acuse de recibo',
    $privacy$
## Responsable del tratamiento

Responsable: {{acreedor}}, NIF/CIF {{nif_acreedor}}.
Dirección a efectos de protección de datos: {{direccion_fiscal}}.
Clínica y sede: {{clinica}}, {{sede}}, {{direccion_sede}}.
Profesional sanitario: {{doctor}}.

## Identificación del paciente

Nombre: {{paciente}}.
DNI/NIE: {{dni}}.

## Para qué se tratan los datos y con qué fundamento

Los datos personales y de salud necesarios se tratan para la asistencia odontológica, diagnóstico, elaboración y conservación de la historia clínica, citas, presupuestos, facturación, cobros y cumplimiento de obligaciones legales. La asistencia sanitaria y la custodia documental se amparan en las bases legales aplicables, incluido el artículo 6 del RGPD, y en la excepción para datos de salud del artículo 9.2.h del RGPD cuando procede. No se solicita consentimiento para los tratamientos necesarios para prestar la asistencia sanitaria.

No se autoriza mediante este documento el envío de publicidad, el uso promocional de fotografías ni ningún otro tratamiento opcional que requiera consentimiento específico y separado.

## Comunicación, seguridad y conservación

Solo accederá a los datos el personal autorizado por razón de sus funciones. Cuando sea necesario, podrán comunicarse los datos mínimos pertinentes a laboratorios, profesionales sanitarios, aseguradoras, prestadores encargados del tratamiento o autoridades con fundamento legal. La historia clínica se conservará durante los plazos exigidos por la normativa sanitaria aplicable y, en su caso, por las responsabilidades legales; los documentos administrativos según sus plazos legales. Los datos están sujetos a obligaciones de confidencialidad.

Para conocer las categorías concretas de destinatarios, las transferencias internacionales si existiesen, los datos de contacto del delegado de protección de datos cuando corresponda y los plazos detallados de conservación, la clínica debe facilitar también su información ampliada de privacidad vigente.

## Derechos de las personas

Puede solicitar acceso, rectificación, supresión cuando proceda, limitación, oposición y portabilidad cuando sea aplicable. Puede dirigir su solicitud al responsable en la dirección indicada y reclamar ante la Agencia Española de Protección de Datos (www.aepd.es). El ejercicio de derechos puede estar sujeto a las obligaciones legales de conservación de documentación sanitaria.

## Acreditación de entrega

En {{ciudad}}, a {{fecha_larga}}, declaro haber recibido y leído esta información básica sobre protección de datos. Mi firma acredita su recepción y no constituye consentimiento para tratamientos opcionales.

Firmante: {{paciente}}, DNI/NIE {{dni}}.
$privacy$,
    jsonb_build_object(
      'category','PRIVACY',
      'signature','ACKNOWLEDGEMENT_ONLY',
      'requires','patient_dni,doctor,site,controller_tax_details,controller_postal_address',
      'legal_review_required',true
    ),
    true, 2
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


-- Keep the identities, debt amounts and terms immutable after document creation.
create or replace function private.guard_debt_document()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_template_code text;
begin
  if tg_op = 'UPDATE' then
    if (old.type in ('DEBT_ACKNOWLEDGEMENT','PRIVACY_NOTICE')
        or new.type in ('DEBT_ACKNOWLEDGEMENT','PRIVACY_NOTICE'))
       and (new.data_json is distinct from old.data_json
         or new.template_id is distinct from old.template_id
         or new.patient_id is distinct from old.patient_id
         or new.type is distinct from old.type
         or new.title is distinct from old.title) then
      raise exception 'SIGNABLE_TERMS_IMMUTABLE' using errcode = '42501';
    end if;
    return new;
  end if;

  select dt.code into v_template_code from public.document_templates dt
   where dt.id = new.template_id and dt.clinic_id = new.clinic_id;

  if new.type = 'PRIVACY_NOTICE' then
    if v_template_code <> 'DATA_PROTECTION'
       or coalesce(new.data_json ->> 'documentKind','') <> 'PRIVACY_NOTICE'
       or btrim(coalesce(new.data_json ->> 'dni','')) = ''
       or btrim(coalesce(new.data_json ->> 'acreedor','')) = ''
       or btrim(coalesce(new.data_json ->> 'nif_acreedor','')) = ''
       or btrim(coalesce(new.data_json ->> 'direccion_fiscal','')) = ''
       or btrim(coalesce(new.data_json ->> 'sede','')) = ''
       or btrim(coalesce(new.data_json ->> 'doctor','')) = '' then
      raise exception 'INVALID_PRIVACY_NOTICE' using errcode = '23514';
    end if;
  end if;

  if new.type = 'DEBT_ACKNOWLEDGEMENT' or v_template_code = 'DEBT_ACKNOWLEDGEMENT' then
    if new.type <> 'DEBT_ACKNOWLEDGEMENT'
       or v_template_code <> 'DEBT_ACKNOWLEDGEMENT'
       or coalesce(new.data_json ->> 'documentKind','') <> 'DEBT_ACKNOWLEDGEMENT'
       or coalesce(new.data_json ->> 'importe_deuda_centimos','') !~ '^[1-9][0-9]*$'
       or btrim(coalesce(new.data_json ->> 'dni','')) = ''
       or btrim(coalesce(new.data_json ->> 'nif_acreedor','')) = ''
       or btrim(coalesce(new.data_json ->> 'doctor','')) = ''
       or btrim(coalesce(new.data_json ->> 'sede','')) = ''
       or btrim(coalesce(new.data_json ->> 'vencimiento','')) = '' then
      raise exception 'INVALID_DEBT_ACKNOWLEDGEMENT' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_debt_document() from public,anon,authenticated;
drop trigger if exists documents_guard_debt on public.documents;
create trigger documents_guard_debt
before insert or update on public.documents for each row
execute function private.guard_debt_document();
commit;
