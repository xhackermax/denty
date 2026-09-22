# RISK_REGISTER · F0

| ID | Riesgo | Impacto | Mitigación |
|---|---|---|---|
| R1 | Perder semántica clínica al reescribir odontograma/plan | Crítico | legacy-spec + dominio puro + fixtures + e2e/visual + matriz de paridad |
| R2 | Backend desplegado difiere de source/contrato inferido | Alto | adaptador `shared/api`, zod, BACKEND_GAPS, no inventar endpoints |
| R3 | Datos clínicos quedan en almacenamiento inseguro | Crítico | eliminar local-api/fallback en F4; demo MSW solo memoria |
| R4 | Agenda táctil regresa al migrar DnD | Alto | dnd-kit + sensores táctil/teclado + e2e 3 viewports |
| R5 | Reescritura grande genera regresiones invisibles | Alto | fases cerradas, CI, pruebas por dominio, paridad 100 %, no borrar legacy hasta F14 |
| R6 | Dependencias nuevas elevan bundle | Medio/alto | ADR por dependencia, imports por icono, dynamic, size-limit |
| R7 | Normativa fiscal/sanitaria se codifica incorrectamente | Alto | backend autoridad, documentación, fuentes oficiales, valores configurables |
