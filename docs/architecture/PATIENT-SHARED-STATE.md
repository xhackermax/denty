# Denty Paciente: estado compartido y sesiones separadas

## Objetivo

Denty Clínica y Denty Paciente son dos experiencias diferentes sobre el mismo expediente. Un hallazgo, cita, presupuesto, pago o documento se crea una sola vez y cada interfaz lo representa según su usuario.

## Preview actual

```text
Pestaña Administrador ─┐
                      ├── Browser shared repository
Pestaña Paciente ─────┘        │
                               ├─ pacientes
                               ├─ odontogramas
                               ├─ citas
                               ├─ planes
                               ├─ presupuestos/pagos
                               ├─ documentos
                               └─ sala de espera

Cada pestaña mantiene aparte:
- rol activo
- usuario activo
- paciente que está visualizando el portal
- navegación local
```

Las escrituras siguen utilizando el almacenamiento compatible con la preview legacy. `storage` y `BroadcastChannel` invalidan la copia en memoria de las demás pestañas para que vuelvan a leer el mismo repositorio.

## Regla de seguridad arquitectónica

El rol activo nunca debe ser la fuente de verdad dentro del expediente compartido. La identidad pertenece a la sesión. Cuando se guarde la base compartida se conserva un usuario técnico neutro/administrativo y se restaura la identidad de la pestaña solo en memoria.

## Proyección paciente

El portal no duplica el odontograma. `patientPortalDentalFindings()` transforma estados profesionales en explicaciones legibles. Ejemplo:

```text
Administrador
26 · superficie O · caries

            ↓ mismo dato

Paciente
26 · Caries detectada
"Hay una zona del diente que necesita valoración o tratamiento restaurador."
```

El diagnóstico definitivo sigue perteneciendo al profesional.

## Migración futura al servidor local

La siguiente evolución sustituirá el repositorio de navegador por:

```text
Denty Clínica ───┐
                 ├── Denty API ─── SQLite/PostgreSQL
Denty Paciente ──┘
```

La sesión pasará a autenticación del servidor y el `patient_id` autorizado se obtendrá del token/sesión, no de un selector. La UI y las proyecciones del paciente pueden mantenerse porque ya están separadas de la identidad persistida.
