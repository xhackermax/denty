export interface BackupStatusView {
  provider: "SUPABASE_MANAGED";
  configured: boolean;
  pitrEnabled: boolean | null;
  backups: Array<{
    id: string;
    createdAt: string | null;
    status: string | null;
    type: string | null;
  }>;
  message: string | null;
}

export async function readSupabaseBackupStatus(input: {
  projectRef?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}): Promise<BackupStatusView> {
  if (!input.projectRef || !input.accessToken) {
    return {
      provider: "SUPABASE_MANAGED",
      configured: false,
      pitrEnabled: null,
      backups: [],
      message:
        "Configura SUPABASE_PROJECT_REF y SUPABASE_MANAGEMENT_ACCESS_TOKEN para consultar backups reales.",
    };
  }

  const fetchImpl = input.fetchImpl ?? fetch;
  const response = await fetchImpl(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(input.projectRef)}/database/backups`,
    {
      headers: { authorization: `Bearer ${input.accessToken}`, accept: "application/json" },
      cache: "no-store",
    },
  );
  const raw = await response.text();
  const payload = raw ? safeJson(raw) : null;
  if (!response.ok) {
    return {
      provider: "SUPABASE_MANAGED",
      configured: true,
      pitrEnabled: null,
      backups: [],
      message: `Supabase Management API devolvió ${response.status}.`,
    };
  }

  const record = isRecord(payload) ? payload : {};
  const source = Array.isArray(record.backups)
    ? record.backups
    : Array.isArray(record.physical_backups)
      ? record.physical_backups
      : Array.isArray(payload)
        ? payload
        : [];
  const pitr = typeof record.pitr_enabled === "boolean" ? record.pitr_enabled : null;
  return {
    provider: "SUPABASE_MANAGED",
    configured: true,
    pitrEnabled: pitr,
    backups: source
      .map(normalizeBackup)
      .filter((item): item is BackupStatusView["backups"][number] => Boolean(item)),
    message: null,
  };
}

function normalizeBackup(value: unknown): BackupStatusView["backups"][number] | null {
  if (!isRecord(value)) return null;
  const id =
    stringValue(value.id) ??
    stringValue(value.name) ??
    stringValue(value.created_at) ??
    crypto.randomUUID();
  return {
    id,
    createdAt: stringValue(value.created_at) ?? stringValue(value.inserted_at) ?? null,
    status: stringValue(value.status),
    type: stringValue(value.type) ?? stringValue(value.backup_type),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
