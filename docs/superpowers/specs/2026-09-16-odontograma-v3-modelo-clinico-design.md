# Odontograma V3 Modelo Clinico Design

## Objetivo

Odontograma V3 convierte el odontograma de Denty en un modelo clinico comun para odontograma visual, plan clinico y comandos de voz. El sistema actual ya permite varios tratamientos por diente mediante `whole_states`, `surfaces`, periodontal y posicion. V3 anade entidades clinicas reales que pueden atravesar varios dientes, agrupar componentes y conservar historial temporal sin romper la vista actual.

## Problema Actual

El modelo actual representa casi todo como estados por diente:

- `whole_states[]` permite multiples estados en una pieza, pero no expresa relaciones entre piezas.
- Un puente se marca como `prosthesis` en dientes individuales, pero no distingue pilares y ponticos.
- Implante, pilar y corona pueden coexistir como estados, pero no forman una restauracion relacionada.
- Protesis removible se marca por diente, no por arco ni por diseno.
- Ortodoncia y odontopediatria existen en tarifas y plan clinico, pero no tienen modelo odontologico propio.
- Periodontal tiene datos por diente, pero falta una lectura visual agregada.
- Voz y plan clinico interpretan estados odontologicos de forma parcial y no comparten una entidad canonica.

## Principio De Diseno

V3 no sustituye de golpe el odontograma actual. Agrega una capa canonica:

```js
db.odontogramEntities = {
  [patientId]: [
    {
      id,
      type,
      status,
      teeth,
      components,
      metadata,
      source,
      created_at,
      updated_at,
      active
    }
  ]
}
```

Cada entidad tiene identidad propia, dientes afectados y componentes internos. La UI actual puede seguir pintando `whole_states` y `surfaces`; las entidades V3 aportan relaciones, historial y sincronizacion clinica.

## Entidades V3

### Puente Fijo

Tipo: `bridge`.

Campos:

- `teeth`: dientes que abarca el puente en orden FDI.
- `components`: lista de componentes por diente:
  - `role: abutment` para pilares.
  - `role: pontic` para ponticos.
  - `role: cantilever` si procede.
- `status`: `planned`, `provisional`, `active`, `review`, `failed`, `completed`.
- `metadata.material`: zirconio, metal-ceramica, resina, provisional u otro.
- `metadata.connector_notes`: notas de conectores, extension o limitaciones.

Reglas:

- Debe tener al menos dos dientes.
- Debe tener al menos un pilar.
- Los ponticos pueden corresponder a dientes ausentes o planificados como ausentes.
- La sincronizacion legacy marca `prosthesis_pending`, `prosthesis` o `prosthesis_bad` en las piezas afectadas, pero la entidad conserva roles.

### Restauracion Sobre Implante

Tipo: `implant_restoration`.

Campos:

- `teeth`: zona o dientes restaurados.
- `components`:
  - `implant`: fixture/implante.
  - `abutment`: pilar.
  - `crown`: corona sobre implante.
  - `screw`: tornillo protesico si se registra.
- `status`: `planned`, `surgery_done`, `uncovered`, `provisional`, `restored`, `review`, `failed`.
- `metadata.system`, `metadata.diameter`, `metadata.length`, `metadata.loading`.

Reglas:

- La corona sobre implante depende del implante.
- El pilar depende del implante.
- La entidad permite representar componentes ya completados y componentes pendientes a la vez.
- El plan clinico debe derivar pasos separados si faltan componentes.

### Protesis Removible

Tipo: `removable_prosthesis`.

Campos:

- `arch`: `upper`, `lower` o `both`.
- `teeth`: dientes repuestos o involucrados.
- `components`:
  - `base`, `clasps`, `rests`, `attachments`, `teeth`.
- `status`: `planned`, `try_in`, `delivered`, `adjustment`, `repair`, `failed`.
- `metadata.design`: parcial, completa, esquelético, flexible, sobredentadura.

Reglas:

- Es una entidad por arco, no por diente aislado.
- Puede asociarse a dientes pilares o implantes de soporte.
- La vista debe mostrar una banda/placa de arco sin saturar cada pieza.

### Ortodoncia

Tipo: `orthodontics`.

Campos:

- `arch`: `upper`, `lower` o `both`.
- `teeth`: dientes activos o implicados.
- `components`: alineadores, brackets, attachments, retenedores, elásticos, expansores.
- `status`: `planned`, `active`, `retention`, `paused`, `completed`.
- `metadata.phase`, `metadata.appliance`, `metadata.objective`.

Reglas:

- No se trata como una patologia por diente.
- Puede generar movimientos esperados sobre `position`.
- El plan clinico debe ubicar ortodoncia en fase de rehabilitacion o interceptiva segun edad/tipo.

### Odontopediatria

Tipo: `pediatric`.

Campos:

- `dentition`: `primary`, `mixed`, `permanent`.
- `teeth`: piezas temporales o permanentes implicadas.
- `components`: sellador, pulpotomia, pulpectomia, corona pediatrica, mantenedor de espacio, aparato interceptivo.
- `status`: `planned`, `active`, `completed`, `monitor`.
- `metadata.exfoliation`, `metadata.space_management`.

Reglas:

- V3 debe poder registrar tratamientos pediatricos aunque el esquema visual principal siga usando FDI permanente.
- Para esta primera fase se permite guardar piezas temporales como texto canonico (`55`, `54`, etc.) y ampliar el render despues.
- El plan clinico debe distinguir tratamiento conservador pediatrico de rehabilitacion adulta.

### Periodontal Visual

Tipo: `periodontal_chart`.

Campos:

- `teeth`: dientes incluidos.
- `components`: resumen por diente y por sitio periodontal.
- `status`: `baseline`, `active_disease`, `maintenance`, `stable`.
- `metadata.max_depth`, `metadata.bleeding_percent`, `metadata.plaque_percent`, `metadata.mobility_summary`.

Reglas:

- No duplica los datos ya guardados en `record.periodontal`.
- Calcula agregados visuales para pintar severidad por color/intensidad.
- Debe poder comparar dos cortes temporales.

### Snapshot Temporal

Tipo: `snapshot`.

Campos:

- `snapshot_id`.
- `label`: `baseline`, `pre_treatment`, `post_treatment`, `review`, texto manual.
- `captured_at`.
- `odontogram`: copia compacta del estado dental.
- `entities`: copia compacta de entidades activas.
- `clinicalPlanItemIds`: tratamientos vinculados en ese momento.

Reglas:

- El historial temporal no reemplaza auditoria.
- Sirve para comparar antes/ahora en UI.
- La comparacion debe detectar cambios en superficies, estados completos y entidades.

## API Interna Propuesta

Funciones puras en `apps/legacy-preview/logic.js`:

```js
export function ensureOdontogramV3(db, patientId)
export function createOdontogramEntity(db, patientId, input)
export function updateOdontogramEntity(db, patientId, entityId, patch)
export function deactivateOdontogramEntity(db, patientId, entityId, reason='')
export function odontogramEntitiesForPatient(db, patientId, filters={})
export function syncLegacyOdontogramFromEntities(db, patientId)
export function odontogramEntityToClinicalItems(db, patientId, entityId)
export function createOdontogramSnapshot(db, patientId, label='review')
export function compareOdontogramSnapshots(before, after)
export function periodontalVisualSummary(db, patientId)
```

Voz y plan clinico deben usar estas funciones, no escribir directamente entidades complejas a mano.

## Flujo De Datos

1. UI, voz o plan clinico piden una accion odontologica.
2. La accion se normaliza a una entidad V3 o a un estado legacy simple.
3. La entidad V3 se guarda en `db.odontogramEntities[patientId]`.
4. `syncLegacyOdontogramFromEntities` actualiza `whole_states` cuando haga falta para que la vista actual siga entendiendo el estado general.
5. `odontogramEntityToClinicalItems` crea o actualiza items del plan clinico con dependencias.
6. La agenda puede planificar esos items con Agenda V12.

## Voz

La voz debe producir entidades complejas cuando el lenguaje lo indique:

- “Puente de 13 a 16 con pilares 13 y 16 y ponticos 14 15”.
- “Implante 36 colocado, falta pilar y corona”.
- “Protesis removible superior parcial”.
- “Ortodoncia con alineadores superior e inferior”.
- “Pulpotomia 75”.

Para estados simples se mantiene `odontogram.set`. Para entidades V3 se agrega:

```js
intent: 'odontogram.entity.create'
slots: {
  type,
  teeth,
  components,
  status,
  metadata
}
```

## Plan Clinico

El plan clinico debe consumir entidades V3:

- Puente: genera preparacion de pilares, provisional si aplica, prueba y cementado.
- Implante: genera implante, segunda fase si aplica, pilar y corona, con dependencias.
- Removible: genera impresiones/registros, prueba y entrega.
- Ortodoncia: genera fase activa y controles.
- Odontopediatria: genera tratamiento especifico y revisiones.
- Periodontal: genera raspado/mantenimiento segun resumen visual.

La regla principal es que voz, odontograma y plan clinico no inventen modelos paralelos.

## UI Odontograma

La UI V3 debe mostrar:

- Puentes como una barra entre dientes con marcas de pilar/pontico.
- Implante + pilar + corona como componentes apilados o chips relacionados en la pieza/zona.
- Protesis removibles como banda por arco.
- Ortodoncia como capa por arco con piezas activas.
- Odontopediatria como capa dedicada cuando el paciente sea infantil o el tratamiento sea temporal.
- Periodontal visual con severidad por bolsa, sangrado, placa, movilidad y recesion.
- Comparador antes/ahora con selector de snapshots.

La primera entrega no necesita resolver todos los detalles graficos finales; si debe dejar controles funcionales y datos visibles.

## Compatibilidad Y Migracion

`migrateDb` debe crear `odontogramEntities` y `odontogramSnapshots` si no existen.

Los datos legacy siguen siendo fuente valida:

- `whole_states` y `surfaces` se conservan.
- `periodontal` existente se conserva.
- Entidades nuevas pueden reflejarse en legacy.
- Legacy no debe borrar entidades V3.

## Pruebas Requeridas

Cada fase debe tener pruebas Node con `assert`:

- Migracion V3 crea colecciones.
- Puente conserva pilares/ponticos y sincroniza legacy.
- Implante conserva componentes y crea dependencias clinicas.
- Removible se guarda por arco.
- Ortodoncia y pediatria se normalizan.
- Periodontal visual calcula resumen.
- Snapshot compara antes/ahora.
- Voz crea entidades V3.
- Plan clinico consume entidades V3.
- UI contiene tokens/controles V3.

## Fuera De Alcance Inicial

- Backend real.
- Firma clinica legal de cambios odontologicos.
- IA externa para diagnostico.
- Render 3D.
- Sustituir completamente el odontograma legacy.
- Decidir diagnosticos clinicos sin intervencion profesional.

## Riesgos

- `logic.js` ya es grande. La implementacion debe mantener funciones pequenas y testables; si se separa en modulos, se debe conservar compatibilidad con el bundle legacy.
- La UI puede saturarse. Deben usarse capas y paneles, no llenar cada diente con todos los detalles a la vez.
- Voz puede malinterpretar puentes o rangos. Las entidades complejas deben pedir confirmacion cuando falten pilares o roles.

## Criterio De Exito

Odontograma V3 se considera correcto cuando:

- Un puente multi-diente se guarda como entidad con roles y se ve como entidad unificada.
- Implante, pilar y corona quedan relacionados y generan plan clinico dependiente.
- Protesis removibles existen por arco.
- Ortodoncia, odontopediatria y periodontal visual tienen representacion de datos.
- Se puede crear un snapshot y comparar cambios.
- Voz y plan clinico usan las mismas funciones de entidad.
- El build de la web sigue pasando y el odontograma anterior no se rompe.
