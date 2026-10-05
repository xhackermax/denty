# Documento de plan de tratamiento en lenguaje llano

Botón **Documento del plan**, en el paso *Plan* del flujo «Plan y presupuesto». Explica al paciente su plan fase a fase. Para cada tratamiento dice qué es, por qué lo necesita, sus ventajas e inconvenientes, otras opciones, qué pasa si no se hace y por qué va en ese orden. Se ve en pantalla para comentarlo en la consulta y se imprime para que el paciente se lo lleve.

## En qué se basa

1. **Orden por fases de la atención.** Primero la salud general y lo urgente (dolor e infección). Después el control de la enfermedad (caries y encías) y una revisión de cómo ha respondido la boca. Luego la rehabilitación (implantes, coronas, prótesis, ortodoncia). Al final, el mantenimiento. Fuente: [Colgate Professional – The Phases of Care Framework](https://www.colgateprofessional.com.au/dentist-resources/advocates-for-oral-health/the-phases-of-care-framework-for-dental-treatment-planning).
   - Denty lo aplica con dos presupuestos nativos.
   - **Fase 1:** extracciones, endodoncias, encías, férulas y empastes.
   - **Fase 2:** implantes, ortodoncia, prótesis fija y removible, pernos y blanqueamiento.
2. **Información previa al consentimiento.** La Ley 41/2002 (art. 4 y art. 10) pide explicar la finalidad y la naturaleza de cada intervención, sus consecuencias, sus riesgos y las contraindicaciones. Fuente: [BOE-A-2002-22188](https://www.boe.es/buscar/act.php?id=BOE-A-2002-22188).
   - El documento cubre esos puntos con palabras sencillas.
   - **No sustituye** al consentimiento informado firmado de cada procedimiento con riesgo. El propio documento lo dice al final.
3. **Lenguaje llano.** Las guías de alfabetización en salud recomiendan escribir para un nivel de lectura de 6.º a 8.º curso. Piden palabras comunes, frases cortas, listas y explicar los términos técnicos. Fuente: [Center for Health Care Strategies](https://www.chcs.org/resource/improving-written-communication-to-promote-health-literacy/) y [NIH/PMC – Readability of patient education materials](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10956377/).
   - Un test automático exige que ninguna frase pase de 25 palabras.
   - Ese mismo test exige una media de 16 palabras por frase como máximo, en todos los textos.

## Dónde está cada cosa

| Qué | Archivo |
|---|---|
| Textos de cada tratamiento y orden dentro de cada fase | `src/domain/plan/treatment-plan-document.ts` |
| Qué tratamiento va a qué fase | `src/domain/plan/treatment-phase.ts` |
| Impresión | `src/shared/documents/treatment-plan-print.ts` |
| Vista en pantalla | `src/shared/clinical/treatment-plan-document-view.tsx` |

## Orden dentro de cada fase y por qué

- **Fase 1:** extracción → endodoncia → encías → empastes → limpieza → férula. Primero se quita el dolor y la infección. Después se frena la enfermedad.
- **Fase 2:** ortodoncia → regeneración de hueso → implante → blanqueamiento → perno → corona → carilla → puente → prótesis removible.
  - Primero se colocan los dientes en su sitio.
  - El hueso va antes del implante.
  - El blanqueamiento va antes de coronas y carillas, para igualar el color.
  - El perno va antes de la corona que sujeta.

Los textos son una base revisable. Conviene que el equipo clínico los lea y adapte el tono a la clínica. Para cambiarlos basta con editar `TREATMENT_GUIDES`; los tests avisan si alguna frase queda demasiado larga.
