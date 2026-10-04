// Minimal in-memory stand-in for Supabase (Auth + PostgREST + the RPCs the tested flows use).
// The real Next.js server talks to it over HTTP exactly as it talks to Supabase, so browser
// tests exercise the app end to end without touching a real database.
import { createServer } from "node:http";

const PORT = Number(process.env.FAKE_SUPABASE_PORT ?? 54399);

export const IDS = {
  clinic: "00000000-0000-4000-8000-000000000001",
  user: "00000000-0000-4000-8000-0000000000a1",
  member: "00000000-0000-4000-8000-0000000000b1",
  staff: "00000000-0000-4000-8000-0000000000c1",
  patient: "00000000-0000-4000-8000-0000000000d1",
  child: "00000000-0000-4000-8000-0000000000d2",
  mixed: "00000000-0000-4000-8000-0000000000d3",
  session: "00000000-0000-4000-8000-0000000000e1",
};

let tables;
let log;
let sequence = 0;

const now = () => new Date().toISOString();
const uuid = () => `00000000-0000-4000-9000-${String(++sequence).padStart(12, "0")}`;

function seed() {
  sequence = 0;
  log = [];
  const inOneDay = new Date(Date.now() + 86_400_000).toISOString();
  tables = {
    profiles: [
      {
        id: IDS.user,
        first_name: "Ana",
        last_name: "Prueba",
        email: "ana@denty.test",
        active: true,
      },
    ],
    app_sessions: [
      {
        id: IDS.session,
        profile_id: IDS.user,
        clinic_id: IDS.clinic,
        auth_session_id: null,
        device_label: "e2e",
        user_agent: "playwright",
        last_seen_at: now(),
        expires_at: inOneDay,
        revoked_at: null,
        created_at: now(),
      },
    ],
    clinic_members: [
      {
        id: IDS.member,
        clinic_id: IDS.clinic,
        profile_id: IDS.user,
        role: "ADMIN",
        active: true,
        is_default: true,
      },
    ],
    patient_accounts: [],
    user_permissions: [],
    staff_members: [
      {
        id: IDS.staff,
        clinic_id: IDS.clinic,
        profile_id: IDS.user,
        display_name: "Dra. Ana Prueba",
        role: "DENTIST",
        active: true,
      },
    ],
    patients: [
      {
        id: IDS.patient,
        clinic_id: IDS.clinic,
        record_number: "DNT-E2E-0001",
        first_name: "Paciente",
        last_name: "De Prueba",
        birth_date: "1985-04-12",
        phone: "600000000",
        email: "paciente@denty.test",
        archived_at: null,
        active: true,
        version: 1,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: IDS.child,
        clinic_id: IDS.clinic,
        record_number: "DNT-E2E-0002",
        first_name: "Niña",
        last_name: "De Prueba",
        birth_date: "2022-03-01",
        phone: "600000000",
        email: "paciente@denty.test",
        archived_at: null,
        active: true,
        version: 1,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: IDS.mixed,
        clinic_id: IDS.clinic,
        record_number: "DNT-E2E-0003",
        first_name: "Niño",
        last_name: "De Prueba",
        birth_date: "2018-01-15",
        phone: "600000000",
        email: "paciente@denty.test",
        archived_at: null,
        active: true,
        version: 1,
        created_at: now(),
        updated_at: now(),
      },
    ],
    dental_entities: [],
    periodontal_measurements: [
      {
        id: uuid(),
        clinic_id: IDS.clinic,
        patient_id: IDS.patient,
        tooth: "16",
        site: "MV",
        probing_depth: 3,
        recession: 0,
        bleeding: false,
        plaque: false,
        suppuration: false,
        measured_at: now(),
      },
    ],
    odontogram_snapshots: [],
    clinical_plans: [],
    clinical_plan_items: [],
    budgets: [],
    budget_items: [],
    clinical_diagnoses: [],
    clinic_settings: [{ clinic_id: IDS.clinic, navigation_layout: null }],
    member_navigation_layouts: [],
  };
}

function matches(row, key, condition) {
  const value = row[key];
  if (condition === "is.null") return value === null || value === undefined;
  if (condition === "not.is.null") return value !== null && value !== undefined;
  if (condition.startsWith("eq.")) return String(value) === condition.slice(3);
  if (condition.startsWith("neq.")) return String(value) !== condition.slice(4);
  if (condition.startsWith("in.("))
    return condition.slice(4, -1).split(",").includes(String(value));
  const range = /^(gt|gte|lt|lte)\.(.*)$/.exec(condition);
  if (range) {
    const [, operator, bound] = range;
    const order = compareValues(value, bound);
    if (order === null) return false;
    return { gt: order > 0, gte: order >= 0, lt: order < 0, lte: order <= 0 }[operator];
  }
  return true;
}

// PostgREST compares numbers and timestamps by value, not as text.
function compareValues(value, bound) {
  if (value === null || value === undefined) return null;
  const left = Number(value);
  const right = Number(bound);
  if (Number.isFinite(left) && Number.isFinite(right)) return left - right;
  const leftTime = Date.parse(String(value));
  const rightTime = Date.parse(bound);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) return leftTime - rightTime;
  return String(value).localeCompare(bound);
}

const RESERVED = new Set(["select", "order", "limit", "offset", "or", "and"]);

function query(table, params) {
  let rows = [...(tables[table] ?? [])];
  for (const [key, condition] of params) {
    if (RESERVED.has(key)) continue;
    rows = rows.filter((row) => matches(row, key, condition));
  }
  const limit = params.get("limit");
  return limit ? rows.slice(0, Number(limit)) : rows;
}

// --- RPCs -----------------------------------------------------------------------------------

// Like the SQL RPC, deactivated rows keep the version that retired them, so the chart version is
// the highest across every row and an emptied chart still moves forward.
function currentVersion(patientId) {
  const rows = tables.dental_entities.filter((row) => row.patient_id === patientId);
  return Math.max(1, ...rows.map((row) => row.version ?? 1));
}

function saveOdontogramBatch({ p_patient_id, p_expected_version, p_entities }) {
  const version = currentVersion(p_patient_id);
  if (p_expected_version !== version) return { conflict: true, currentVersion: version };
  const retiring = tables.dental_entities.filter(
    (row) => row.patient_id === p_patient_id && row.active,
  );
  const inserting = p_entities.filter((entity) => entity.active ?? true);
  if (!retiring.length && !inserting.length) return { version, entities: [] };
  const next = version + 1;
  for (const row of retiring) Object.assign(row, { active: false, version: next });
  for (const entity of inserting) {
    tables.dental_entities.push({
      // The fake plan sync links items by entity id, so ids stay stable across saves.
      id: entity.id ?? uuid(),
      clinic_id: IDS.clinic,
      patient_id: p_patient_id,
      tooth: entity.tooth ?? null,
      arch: entity.arch ?? null,
      entity_type: entity.entityType,
      status: entity.status,
      surfaces_json: entity.surfaces ?? [],
      attributes_json: entity.attributes ?? {},
      parent_id: entity.parentId ?? null,
      active: true,
      version: next,
      created_at: now(),
    });
  }
  const entities = tables.dental_entities.filter(
    (row) => row.patient_id === p_patient_id && row.active,
  );
  return { version: next, entities };
}

const TREATMENT_FOR = { CARIES: ["filling", "Obturación", 4500] };

function syncClinicalPlan({ p_patient_id }) {
  let plan = tables.clinical_plans.find((row) => row.patient_id === p_patient_id);
  const odontogramVersion = currentVersion(p_patient_id);
  if (!plan) {
    plan = {
      id: uuid(),
      clinic_id: IDS.clinic,
      patient_id: p_patient_id,
      status: "DRAFT",
      version: 0,
      source_odontogram_version: null,
      created_at: now(),
      updated_at: now(),
    };
    tables.clinical_plans.push(plan);
  }
  let added = 0;
  const findings = tables.dental_entities.filter(
    (row) => row.patient_id === p_patient_id && row.active && TREATMENT_FOR[row.entity_type],
  );
  for (const finding of findings) {
    const exists = tables.clinical_plan_items.some((item) => item.dental_entity_id === finding.id);
    if (exists) continue;
    const [code, label, price] = TREATMENT_FOR[finding.entity_type];
    tables.clinical_plan_items.push({
      id: uuid(),
      clinic_id: IDS.clinic,
      plan_id: plan.id,
      dental_entity_id: finding.id,
      tooth: finding.tooth,
      treatment_code: code,
      label,
      patient_label: label,
      status: "PLANNED",
      phase: 1,
      priority: 1,
      price_cents: price,
      price_snapshot_cents: price,
      billing_mode: "separate",
      created_at: now(),
    });
    added += 1;
  }
  plan.version += 1;
  plan.source_odontogram_version = odontogramVersion;
  plan.updated_at = now();
  return { ...plan, summary: { added, linked: 0, superseded: 0, completed: 0 } };
}

function syncBudgetFromPlan({ p_patient_id }) {
  const plan = tables.clinical_plans.find((row) => row.patient_id === p_patient_id);
  const items = tables.clinical_plan_items.filter((item) => item.plan_id === plan?.id);
  const total = items.reduce((sum, item) => sum + (item.price_snapshot_cents ?? 0), 0);
  let budget = tables.budgets.find(
    (row) => row.patient_id === p_patient_id && row.status === "DRAFT",
  );
  if (!budget) {
    budget = {
      id: uuid(),
      clinic_id: IDS.clinic,
      patient_id: p_patient_id,
      clinical_plan_id: plan?.id ?? null,
      code: `P-E2E-R${tables.budgets.length + 1}`,
      status: "DRAFT",
      revision: tables.budgets.length + 1,
      version: 0,
      created_at: now(),
    };
    tables.budgets.push(budget);
  }
  budget.total_cents = total;
  budget.source_plan_version = plan?.version ?? null;
  budget.version += 1;
  tables.budget_items = tables.budget_items.filter((item) => item.budget_id !== budget.id);
  for (const item of items) {
    tables.budget_items.push({
      id: uuid(),
      clinic_id: IDS.clinic,
      budget_id: budget.id,
      clinical_plan_item_id: item.id,
      description: item.label,
      tooth: item.tooth,
      billing_mode: "separate",
      quantity: 1,
      unit_price_cents: item.price_snapshot_cents,
      total_cents: item.price_snapshot_cents,
    });
  }
  return budget;
}

function setClinicNavigationLayout({ p_clinic_id, p_layout }) {
  const row = tables.clinic_settings.find((candidate) => candidate.clinic_id === p_clinic_id);
  if (row) row.navigation_layout = p_layout;
  return null;
}

function setMyNavigationLayout({ p_clinic_id, p_layout }) {
  tables.member_navigation_layouts = tables.member_navigation_layouts.filter(
    (row) => !(row.clinic_id === p_clinic_id && row.profile_id === IDS.user),
  );
  if (p_layout)
    tables.member_navigation_layouts.push({
      clinic_id: p_clinic_id,
      profile_id: IDS.user,
      layout: p_layout,
    });
  return null;
}

// One free slot the next day, inside the requested part of the day (minutes after midnight).
function agendaNextSlots({ p_not_before, p_from_minute, p_duration_min }) {
  const day = new Date(Date.parse(p_not_before) + 86_400_000).toISOString().slice(0, 10);
  const startMinute = Math.max(p_from_minute ?? 0, 9 * 60) + 30;
  const at = (minute) =>
    `${day}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00+02:00`;
  return {
    durationMin: p_duration_min,
    slots: [
      {
        startsAt: at(startMinute),
        endsAt: at(startMinute + p_duration_min),
        staffId: IDS.staff,
        staffName: "Dra. Ana Prueba",
      },
    ],
  };
}

function createClinicalDiagnosis({ p_patient_id, p_input }) {
  const row = {
    id: uuid(),
    clinic_id: IDS.clinic,
    patient_id: p_patient_id,
    encounter_id: null,
    category: p_input.category,
    value: p_input.value,
    detail: p_input.detail ?? {},
    justification: p_input.justification ?? "",
    status: "active",
    created_by: IDS.user,
    created_at: now(),
    version: 1,
  };
  tables.clinical_diagnoses.push(row);
  return row;
}

// Mirrors the persisted payload of the stage6 SQL RPC; reads committed rows only.
function createOdontogramSnapshot({ p_patient_id, p_label = null }) {
  const patient = tables.patients.find((row) => row.id === p_patient_id);
  if (!patient) throw new Error("PATIENT_NOT_FOUND");
  const allEntities = tables.dental_entities.filter((row) => row.patient_id === p_patient_id);
  const version = Math.max(1, ...allEntities.map((row) => row.version ?? 1));
  const entities = allEntities
    .filter((row) => row.active)
    .map((row) => ({
      id: row.id,
      tooth: row.tooth,
      arch: row.arch,
      entityType: row.entity_type,
      status: row.status,
      surfacesJson: row.surfaces_json,
      attributesJson: row.attributes_json,
      parentId: row.parent_id,
      active: row.active,
      version: row.version,
    }));
  const latestSites = new Map();
  const measurements = tables.periodontal_measurements
    .filter((row) => row.patient_id === p_patient_id)
    .sort(
      (a, b) =>
        (b.exam_version ?? -1) - (a.exam_version ?? -1) ||
        String(b.measured_at).localeCompare(String(a.measured_at)) ||
        String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")),
    );
  for (const row of measurements) {
    const key = `${row.tooth}:${row.site}`;
    if (!latestSites.has(key)) latestSites.set(key, row);
  }
  const periodontal = [...latestSites.values()].map((row) => ({
    id: row.id,
    tooth: row.tooth,
    site: row.site,
    probingDepth: row.probing_depth,
    recession: row.recession,
    bleeding: row.bleeding,
    plaque: row.plaque,
    suppuration: row.suppuration,
    mobility: row.mobility,
    furcation: row.furcation,
    measuredAt: row.measured_at,
  }));
  const snapshot = {
    id: uuid(),
    clinic_id: patient.clinic_id,
    patient_id: p_patient_id,
    label: p_label?.trim() || null,
    version,
    created_at: now(),
    payload_json: structuredClone({ schemaVersion: 1, version, entities, periodontal }),
  };
  tables.odontogram_snapshots.push(snapshot);
  (tables.clinical_history_events ??= []).push({
    id: uuid(),
    clinic_id: patient.clinic_id,
    patient_id: p_patient_id,
    actor_id: IDS.user,
    event_type: "ODONTOGRAM_SNAPSHOT_CREATED",
    entity_id: snapshot.id,
    entity_type: "ODONTOGRAM_SNAPSHOT",
    payload_json: { version },
    created_at: now(),
  });
  return snapshot;
}

const RPCS = {
  create_odontogram_snapshot: createOdontogramSnapshot,
  save_odontogram_batch: saveOdontogramBatch,
  sync_clinical_plan: syncClinicalPlan,
  sync_budget_from_plan: syncBudgetFromPlan,
  set_clinic_navigation_layout: setClinicNavigationLayout,
  set_my_navigation_layout: setMyNavigationLayout,
  agenda_next_slots: agendaNextSlots,
  // The real function coalesces to an empty list when no campaign has activity yet.
  stage11_campaign_roi: () => [],
  create_clinical_diagnosis: createClinicalDiagnosis,
};

// --- HTTP -----------------------------------------------------------------------------------

function send(response, status, body) {
  response.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
  });
  response.end(body === undefined ? "" : JSON.stringify(body));
}

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : {};
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  try {
    if (path === "/__reset") {
      seed();
      return send(response, 200, { ok: true });
    }
    if (path === "/__log") return send(response, 200, log);
    if (path === "/__state") return send(response, 200, tables);
    if (request.method === "OPTIONS") return send(response, 204);

    if (path === "/auth/v1/user") {
      log.push({ kind: "auth", path });
      return send(response, 200, {
        id: IDS.user,
        aud: "authenticated",
        role: "authenticated",
        email: "ana@denty.test",
        app_metadata: {},
        user_metadata: {},
        created_at: now(),
      });
    }

    const rpc = path.match(/^\/rest\/v1\/rpc\/([\w]+)$/);
    if (rpc) {
      const name = rpc[1];
      const body = await readBody(request);
      const handler = RPCS[name];
      log.push({ kind: "rpc", name, body, handled: Boolean(handler) });
      return send(response, 200, handler ? handler(body) : null);
    }

    const table = path.match(/^\/rest\/v1\/([\w]+)$/)?.[1];
    if (table) {
      const known = table in tables;
      if (request.method === "GET") {
        log.push({ kind: "select", table, known, query: url.search });
        return send(response, 200, query(table, url.searchParams));
      }
      const body = await readBody(request);
      log.push({ kind: request.method.toLowerCase(), table, known, body });
      if (request.method === "POST") {
        const row = { id: uuid(), created_at: now(), ...body };
        (tables[table] ??= []).push(row);
        return send(response, 201, [row]);
      }
      if (request.method === "PATCH") {
        const rows = query(table, url.searchParams);
        for (const row of rows) Object.assign(row, body);
        return send(response, 200, rows);
      }
      return send(response, 204);
    }

    log.push({ kind: "unknown", method: request.method, path });
    return send(response, 404, { message: `fake-supabase: ${request.method} ${path}` });
  } catch (error) {
    log.push({ kind: "error", path, message: String(error) });
    return send(response, 500, { message: String(error) });
  }
});

seed();
server.listen(PORT, "127.0.0.1", () => {
  console.log(`fake-supabase listening on ${PORT}`);
});
