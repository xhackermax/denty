# Guía: IA + NLU para dictar a Denty por micrófono

Objetivo: el profesional habla ("Oye Denty, caries mesial y oclusal en el 36") y Denty
**anota** lo dicho en la ficha correcta, sobre todo en el odontograma.

## 1. Cómo funciona hoy (lo que ya está hecho)

```
Micrófono ─▶ Transcripción ─▶ NLU (reglas) ─▶ Plan de acciones ─▶ Confirmación ─▶ API canónica
             (navegador u      local-nlu.ts     readback en voz     (si modifica)    (la misma que
              OpenAI)                           alta + ambigüedades                   usa la pantalla)
```

| Pieza | Archivo | Qué hace |
|---|---|---|
| Barra de voz | `src/features/voice/voice-command-bar.tsx` | Botón de micrófono, "Oye Denty", muestra el plan y pide confirmación. |
| Transcripción | `src/app/api/voice/transcribe/route.ts` | Si el navegador no tiene Web Speech (Safari/iPhone, Firefox), envía el audio a OpenAI. **Requiere sesión de Denty** (Etapa 13). |
| NLU | `src/features/voice/local-nlu.ts` | Convierte el texto en acciones tipadas (`LocalVoiceAction`). No usa IA: son reglas deterministas en español. |
| Ejecutor | `src/features/voice/voice-executor.ts` | Solo ejecuta las acciones de `EXECUTABLE_VOICE_ACTION_TYPES`, valida todo el plan antes de escribir nada y usa `getBrowserApi()` (mismo camino que la UI). |

### Qué entiende ya del odontograma

- **Numeración FDI** 11–48 (permanentes) y 51–85 (temporales): "el 36", "pieza 46", "del 14 al 16".
- **Caras**: mesial (M), distal (D), oclusal/incisal (O), vestibular (V), lingual/palatino (L).
- **Estados**: caries, sano, ausente/falta/perdido.
- **Prótesis**: "puente del 14 al 16 con el 15 ausente", "prótesis removible superior".
- **Periodoncia**: "bolsa de 5 en el 16 mesial", "sangrado", "supuración", "placa", "movilidad grado 2".
- **Tratamientos** (se reconocen, ver §4): endodoncia, reendodoncia, apicectomía, corona,
  perno, reconstrucción, implante, extracción, incrustación, obturación/empaste, raspado, limpieza.
- **Otros**: crear paciente, nota clínica, sincronizar presupuesto, registrar cobro (importe + método).

## 2. Activarlo en 5 minutos

1. Crea una clave en <https://platform.openai.com/api-keys> (cuenta de empresa, con límite de gasto).
2. En Vercel → proyecto `denty-repo` → *Settings → Environment Variables* añade en
   **Production** (y Preview si quieres probar):
   - `OPENAI_API_KEY` = la clave
   - `OPENAI_TRANSCRIBE_MODEL` = `gpt-4o-mini-transcribe` (barato y bueno en español)
3. *Deployments → Redeploy*.
4. Abre Denty en **HTTPS**, entra con tu usuario, pulsa el micrófono y acepta el permiso.
5. Prueba: "Oye Denty, abre la ficha de Ana Ruiz" → "caries oclusal en el 36" → confirma.

> En Chrome/Edge de escritorio la transcripción la hace el navegador (gratis). En iPhone
> se usa OpenAI (~0,003 € por minuto con el modelo mini).

## 3. Añadir una IA que "entienda" frases libres (recomendado)

Las reglas fallan con frases largas o desordenadas ("al 36 ponle una caries, por mesial
y también por oclusal, y el 37 está ausente"). La forma segura de añadir IA **sin perder
el control** es que el modelo solo **rellene el mismo JSON** que ya produce el NLU:

1. **Nueva ruta** `src/app/api/voice/interpret/route.ts` (servidor, `runtime = "nodejs"`):
   - Exige sesión igual que `/api/voice/transcribe` (`resolveRequestIdentity`).
   - Llama a OpenAI (Responses API) con **salida estructurada** (`json_schema`) cuyo
     esquema es exactamente la unión `LocalVoiceAction` (tipos, dientes FDI como texto de
     2 dígitos, caras `M|O|D|V|L`, estados permitidos).
   - Prompt de sistema corto: "Eres el asistente de una clínica dental española. Devuelve
     solo acciones del esquema. Si falta un dato (diente, cara, importe) no lo inventes:
     añádelo en `ambiguities`."
   - Añade en el prompt el contexto que ya existe: paciente activo, diente seleccionado,
     pantalla actual (`LocalVoiceContext`).
2. **En la barra de voz**: primero `planLocalVoiceCommand` (reglas). Solo si
   `confidence < 0.6` o hay ambigüedades, llama a `/api/voice/interpret`.
3. **Valida siempre** la respuesta del modelo con Zod y con `isExecutableVoiceAction()`.
   El ejecutor ya hace *preflight* de todo el plan: si una acción no es válida, no se
   escribe nada.
4. **Confirmación obligatoria** para cualquier escritura (ya implementado): Denty lee en voz
   alta lo que va a hacer ("Caries M+O en el 36. ¿Confirmo?").
5. **Registro**: guarda en `audit_log` el texto original y el plan (sin audio) para
   poder revisar errores del modelo.

Reglas de seguridad para la IA:

- La clave solo en servidor (`OPENAI_API_KEY`, nunca `NEXT_PUBLIC_`).
- El modelo **no** escribe en la base de datos: solo propone acciones; escribe el ejecutor.
- No envíes al modelo más datos personales de los necesarios (nombre y contexto clínico
  del paciente activo). Firma el contrato de encargado de tratamiento (DPA) con el
  proveedor y anótalo en el registro de actividades (RGPD, datos de salud).

## 4. Siguiente paso para que "entienda todo el odontograma"

Hoy el NLU **reconoce** tratamientos ("corona en el 36") pero el ejecutor todavía no los
aplica (`clinical.treatment` no está en `EXECUTABLE_VOICE_ACTION_TYPES`). Para cerrarlo:

1. Mapear cada código del NLU (`endodontics`, `crown`, `implant`, …) al `treatment_catalog`
   de la clínica (códigos `ENDODONTICS`, `CROWN_ZIRCONIA`, `IMPLANT`, … que la Etapa 13
   crea por defecto).
2. En `voice-executor.ts` añadir el caso `clinical.treatment` usando
   `getBrowserApi().clinical.plan.addItem(...)` (el mismo que la pantalla del plan) y el
   estado `PLANNED | COMPLETED`.
3. Añadir el tipo a `EXECUTABLE_VOICE_ACTION_TYPES` y un test en
   `src/features/voice/__tests__`.
4. Repetir para `appointment.schedule` (usa `book_appointment`) y `lab.transition`.

Frases de prueba recomendadas (añádelas como tests):

| Frase | Acción esperada |
|---|---|
| "caries mesial y oclusal en el 36" | `odontogram.set_state` 36, CARIES, [M,O] |
| "el 18 está ausente" | `odontogram.set_state` 18, MISSING |
| "puente del 14 al 16 con el 15 ausente" | `odontogram.bridge` [14,15,16], missing [15] |
| "bolsa de 6 en el 26 distal con sangrado" | `periodontal.update` 26, D, 6 mm, sangrado |
| "endodoncia en el 46" | `clinical.treatment` 46, endodontics (tras §4) |
| "cobra 50 euros con tarjeta" | `payment.record` 5000, CARD |
