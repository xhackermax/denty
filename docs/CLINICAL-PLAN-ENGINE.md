# Motor de plan clínico Denty Web

La web usa una única fuente clínica para profesional y paciente.

## Orden clínico

El motor recupera la jerarquía determinista de Denty APK:

1. Dolor / infección / control agudo.
2. Control periodontal.
3. Caries / saneamiento.
4. Dientes ausentes / planificación.
5. Rehabilitación / ortodoncia / prótesis.

El motor ordena tratamientos ya registrados por el profesional. No diagnostica ni inventa tiempos biológicos.

## Dependencias

Cada `clinicalPlanItem` puede declarar `depends_on`. Además, Denty infiere relaciones conservadoras del mismo diente, por ejemplo:

- endodoncia -> perno -> corona;
- endodoncia -> corona si no existe perno;
- extracción -> implante;
- implante -> corona sobre implante.

Las dependencias explícitas tienen prioridad sobre el orden general por fases.

## Odontograma

`syncClinicalPlanFromOdontogram()` transforma indicaciones ya marcadas en el odontograma en elementos del plan sin borrar tratamientos simultáneos del mismo diente. Un diente puede mantener endodoncia, perno y corona como elementos distintos del plan.

Una ausencia no se transforma automáticamente en implante. Crea un grupo de alternativas para valoración.

## Alternativas

Los grupos de alternativas mantienen separadas:

- información clínica pendiente;
- opciones candidatas;
- ventajas e inconvenientes;
- preferencia del paciente;
- validación profesional.

La preferencia del paciente nunca equivale a aprobación clínica.

Para una ausencia se incluyen actualmente como plantillas configurables: implante + corona, puente fijo, puente adhesivo Maryland, prótesis removible y provisional.

## Portal paciente

El paciente lee el mismo plan mediante `patientClinicalPlanProjection()`. Se transforma el lenguaje, no los datos clínicos. La ruta explica el orden y las dependencias y no muestra una fecha final si la clínica no ha definido una fecha fiable.
