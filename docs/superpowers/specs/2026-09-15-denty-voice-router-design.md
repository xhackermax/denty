# Denty Voice Router and Quick Tasks Design

## Goal
Make voice a first-class input layer across Denty so a dentist can operate patient records, odontogram, agenda, budgets/payments, laboratory work, comments/alerts, and navigation using natural Spanish. Make the home-page Tareas button a useful quick-action launcher for create patient, collect payment, create appointment, and receive laboratory work.

## Architecture
Denty receives typed or spoken text through one Voice Router. The router first tries a deterministic dental NLU that runs in the browser and produces a structured command. If local rules cannot understand the request, an optional AI adapter can send only the minimum command context to the local Denty server. The server can interpret with a small local Ollama model, an OpenAI-compatible endpoint, or an MCP HTTP adapter configured by environment variables. AI never mutates clinical data directly: it returns a validated structured command, and Denty's command executor performs the mutation with snapshots/audit.

Structured command shape:

```js
{
  intent: 'odontogram.set',
  confidence: 0.96,
  source: 'rules' | 'llm' | 'mcp',
  slots: { patient_id, tooth, surface, status },
  requires_confirmation: false
}
```

## Local deterministic intents
- `patient.select`: select an existing patient by name or ficha.
- `patient.create`: create a patient from a spoken full name, with optional phone/DNI where present.
- `odontogram.set`: caries, healthy, missing, extraction, filling, crown, endodontics, post, implant, bridge/fixed prosthesis, removable prosthesis; distinguish correct/performed, unsatisfactory/repeat, and pending/indicated states.
- `periodontal.update`: mobility and probing depth with site mapping.
- `appointment.create`: create a new appointment for current/named patient; parse today/tomorrow/weekday, clock time, optional duration and treatment/tooth.
- `comment.add`: add a clinical comment to the current/named patient.
- `alert.add`: create clinical alerts such as allergies.
- `budget.create`: create a budget from treatment/tooth, preferring the procedure catalog price rather than a hard-coded value.
- `payment.record`: register a patient payment with amount and method, optionally linked to a budget.
- `lab.receive`: receive/create a laboratory work item in `recibido` state.
- `navigation.open`: open patient record, odontogram, agenda, laboratory, finances, tasks, or assistant.

## Voice flow
1. User presses the microphone button or uses typed Denty command input.
2. Browser speech recognition returns Spanish text when available.
3. Voice Router parses locally.
4. If understood, executor validates patient/context and performs the app action.
5. If not understood and AI mode is enabled, browser calls `/api/ai/interpret` or `/api/mcp/interpret` on the local Denty server.
6. Returned structured command is schema-validated and executed through the same executor.
7. Mutation uses the existing snapshot/undo/persistence/audit path. User sees a concise readback and optional speech synthesis.
8. External AI failure never blocks local rules; Denty falls back to a clear “not understood” result.

## Safety and privacy
- Local rules are preferred and require no internet.
- The browser sends only command text and minimum context to the local server for AI fallback, not the entire database.
- API keys are not stored in browser localStorage. Server-side providers use environment variables.
- AI output is treated as untrusted input and must match allowed intents and slot schemas before execution.
- Destructive actions such as archive/delete/sign remain outside the AI executor.
- Financial writes and clinically meaningful changes are snapshot/audited and remain undoable where the current app permits it.

## Quick Tasks UX
The home-page `+ Tarea` button opens a quick-action modal with four primary actions:
1. Crear paciente
2. Cobrar
3. Dar cita
4. Recibir trabajo del laboratorio

The same actions appear at the top of the Tareas/Pendientes page. The tasks page also shows actual task records when present and allows marking them done.

Global payment and lab-work dialogs must allow patient selection, because the quick launcher can be invoked without an active patient.

## Settings
The Denty Local AI and MCP settings cards expose status and configuration notes. Browser settings include voice enabled/readback and AI fallback mode. Provider secrets remain server-side. The local server exposes a health/config endpoint and interpreter endpoints.

## Compatibility
Preserve current localStorage data and the existing 1.3.3 database key. Do not introduce a new storage key for this feature. Existing modern verification scripts must continue to pass; legacy version-specific scripts are known to fail on the supplied baseline and are not regressions.
