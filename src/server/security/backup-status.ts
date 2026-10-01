export interface BackupStatusView {
  provider: "SUPABASE_MANAGED";
  configured: boolean;
  connected: boolean;
  projectRef: string | null;
  dashboardUrl: string | null;
  checkedAt: string;
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
  supabaseUrl?: string;
  accessToken?: string;
  fetchImpl?: typeof fetch;
}): Promise<BackupStatusView> {
  const derivedRef = projectFromUrl(input.supabaseUrl);
  const projectRef = input.projectRef?.trim() || derivedRef;
  const accessToken = input.accessToken?.trim();
  const validRef = projectRef && /^[a-z0-9-]+$/i.test(projectRef) ? projectRef : null;
  const base: BackupStatusView = {
    provider: "SUPABASE_MANAGED",
    configured: Boolean(validRef && accessToken),
    connected: false,
    projectRef: validRef,
    dashboardUrl: validRef
      ? `https://supabase.com/dashboard/project/${validRef}/database/backups`
      : null,
    checkedAt: new Date().toISOString(),
    pitrEnabled: null,
    backups: [],
    message: null,
  };
  if (derivedRef && validRef && derivedRef !== validRef)
    return {
      ...base,
      configured: false,
      message:
        "SUPABASE_PROJECT_REF no coincide con el proyecto de SUPABASE_URL. Corrige la configuración del servidor.",
    };
  if (!validRef || !accessToken)
    return {
      ...base,
      message: !validRef
        ? "Configura SUPABASE_URL (o SUPABASE_PROJECT_REF si usas un dominio propio) y SUPABASE_MANAGEMENT_ACCESS_TOKEN en el servidor de Vercel para consultar las copias automáticas."
        : "Configura SUPABASE_MANAGEMENT_ACCESS_TOKEN solo en el servidor de Vercel y vuelve a desplegar. Las copias pueden seguir ejecutándose en Supabase aunque Denty no pueda consultar su estado.",
    };
  try {
    const response = await (input.fetchImpl ?? fetch)(
      `https://api.supabase.com/v1/projects/${encodeURIComponent(validRef)}/database/backups`,
      {
        headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok)
      return {
        ...base,
        message:
          response.status === 401 || response.status === 403
            ? "El token de Supabase Management no es válido o no tiene acceso a este proyecto. Revisa SUPABASE_MANAGEMENT_ACCESS_TOKEN en el servidor."
            : `No se pudo consultar Supabase (${response.status}). Reintenta la actualización del estado.`,
      };
    const payload: unknown = await response.json();
    if (!Array.isArray(payload) && !isRecord(payload))
      return {
        ...base,
        message: "Supabase devolvió una respuesta de copias no válida. Reintenta la consulta.",
      };
    const record = isRecord(payload) ? payload : {};
    const source = Array.isArray(record.backups)
      ? record.backups
      : Array.isArray(record.physical_backups)
        ? record.physical_backups
        : Array.isArray(payload)
          ? payload
          : null;
    if (!source)
      return {
        ...base,
        message: "La respuesta de Supabase no incluye el listado de copias. Reintenta la consulta.",
      };
    return {
      ...base,
      connected: true,
      pitrEnabled: typeof record.pitr_enabled === "boolean" ? record.pitr_enabled : null,
      backups: source
        .map(normalizeBackup)
        .filter((item): item is BackupStatusView["backups"][number] => item !== null)
        .sort(
          (a, b) =>
            (b.createdAt ? Date.parse(b.createdAt) : 0) -
            (a.createdAt ? Date.parse(a.createdAt) : 0),
        ),
    };
  } catch (cause) {
    return {
      ...base,
      message:
        cause instanceof SyntaxError
          ? "Supabase devolvió una respuesta de copias no válida. Reintenta la consulta."
          : "No se pudo conectar con Supabase para consultar las copias. Reintenta la actualización del estado.",
    };
  }
}

function projectFromUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:"
      ? (/^([a-z0-9-]+)\.supabase\.co$/i.exec(url.hostname)?.[1] ?? null)
      : null;
  } catch {
    return null;
  }
}
function normalizeBackup(value: unknown): BackupStatusView["backups"][number] | null {
  if (!isRecord(value)) return null;
  const date = stringValue(value.created_at) ?? stringValue(value.inserted_at);
  const createdAt = date && Number.isFinite(Date.parse(date)) ? date : null;
  return {
    id:
      stringValue(value.id) ??
      (typeof value.id === "number" ? String(value.id) : null) ??
      stringValue(value.name) ??
      createdAt ??
      crypto.randomUUID(),
    createdAt,
    status: stringValue(value.status),
    type:
      stringValue(value.type) ??
      stringValue(value.backup_type) ??
      (typeof value.is_physical_backup === "boolean"
        ? value.is_physical_backup
          ? "PHYSICAL"
          : "LOGICAL"
        : null),
  };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringValue(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}
