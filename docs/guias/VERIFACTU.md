# Guía: configurar VERI\*FACTU según cada empresa

> Información orientativa a septiembre de 2026. **Confirma siempre con tu asesoría**:
> Denty no sustituye el asesoramiento fiscal.

## 1. ¿Me afecta?

- Las clínicas dentales **siempre deben emitir factura**, aunque la asistencia sanitaria
  esté exenta de IVA (art. 20.1.3º LIVA). Por tanto, el software de facturación debe
  cumplir el Reglamento de sistemas informáticos de facturación (RD 1007/2023, "Reglamento
  VERI\*FACTU").
- Fechas tras el **Real Decreto-ley 15/2025**:
  - **1 de enero de 2027**: contribuyentes del **Impuesto sobre Sociedades** (SL, SA,
    sociedades profesionales).
  - **1 de julio de 2027**: resto, incluidos **autónomos** (IRPF) y comunidades de bienes.
- **No aplica** (tienen su propio sistema): empresas en el **SII**, y territorios forales
  (País Vasco con TicketBAI/Batuz, Navarra). Consulta tu caso.

## 2. Elige el modo en Denty (Ajustes → Facturación)

| Modo | Qué hace Denty | Para quién |
|---|---|---|
| `VERIFACTU` | Cada factura genera un registro encadenado (hash SHA-256 con el anterior) y se **envía a la AEAT** en el momento. QR "VERI\*FACTU" en la factura. | Recomendado para la mayoría de clínicas: menos requisitos de conservación. |
| `NO_VERIFACTU` | Registros encadenados y firmados que se **conservan** en Denty y se entregan a la AEAT si los pide. | Solo si tu asesoría lo prefiere; exige firma electrónica de cada registro y conservación estricta. |

## 3. Pasos por tipo de empresa

### Autónomo (dentista persona física)
1. Ajustes → Facturación: **Nombre fiscal** = tu nombre y apellidos; **NIF** personal;
   domicilio fiscal.
2. Serie de facturas: p. ej. `F2027` (una serie por año) y `R2027` para rectificativas.
3. Certificado electrónico de **persona física** (FNMT) en formato PEM →
   variable `VERIFACTU_CERTIFICATE_PEM` en Vercel (o `VERIFACTU_CERTIFICATE_PATH`).
4. Modo `VERIFACTU`, entorno `test` hasta validar; a partir del 1‑7‑2027 obligatorio.

### Sociedad (SL/SLP)
1. Nombre fiscal = razón social exacta; **CIF** de la sociedad; domicilio social.
2. Certificado de **representante de persona jurídica** (FNMT) en PEM.
3. Series por sede si tienes varias clínicas (p. ej. `MAD-2027`, `BCN-2027`): cada serie
   mantiene su numeración correlativa.
4. Modo `VERIFACTU`, entorno `test`; obligatorio desde el 1‑1‑2027.

### Varias clínicas / grupo
- Cada **empresa** (NIF distinto) es una clínica distinta en Denty, con su propia
  configuración fiscal y su propio certificado. Varias **sedes** de la misma empresa
  comparten NIF y cadena de registros, con series distintas.

## 4. IVA en odontología (resumen)
- Asistencia dental a personas: **exenta** (causa E1, art. 20.1.3º). Denty debe indicar
  la causa de exención en la línea.
- Estética sin finalidad terapéutica (p. ej. blanqueamiento puramente estético), venta de
  productos (cepillos, colutorios): **21 %** normalmente. Revísalo con la asesoría y
  configura el tipo por tratamiento en el catálogo.

## 5. Estado actual en Denty (importante)
- ✅ Series, numeración correlativa, bloqueo de facturas emitidas, rectificativas R1–R5,
  registro fiscal encadenado (hash) y cola de envío (`queue_verifactu_submission`).
- ⏳ **Pendiente**: el conector que firma y **envía** el XML a los servicios web de la
  AEAT y guarda el CSV de respuesta, y el QR tributario en el PDF. Hasta que exista, deja
  el entorno en `test` y **no** declares el sistema como VERI\*FACTU en producción.
- Antes de producción: declaración responsable del fabricante del software (obligatoria
  para quien comercialice Denty) y prueba en el entorno de pruebas de la AEAT
  (`prewww1.aeat.es`).

## 6. Checklist de puesta en marcha
1. Datos fiscales completos y revisados por la asesoría.
2. Certificado cargado y probado en entorno `test`.
3. 5 facturas de prueba (normal, exenta, con IVA, rectificativa, anulación) aceptadas.
4. Cambiar entorno a `production` solo en la fecha que te corresponda.
