export interface SupabaseRestCredentials {
  url: string;
  key: string;
}

export class SupabaseRestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown,
  ) {
    super(message);
  }
}

export class SupabaseRestClient {
  constructor(
    private readonly credentials: SupabaseRestCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async select<T>(table: string, query: Record<string, string | number | undefined> = {}) {
    const url = this.url(table, query);
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: this.headers(),
      cache: "no-store",
    });
    return this.parseJson<T[]>(response);
  }

  async insert<T>(table: string, body: Record<string, unknown>) {
    const response = await this.fetchImpl(this.url(table), {
      method: "POST",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const rows = await this.parseJson<T[]>(response);
    const row = rows[0];
    if (!row) throw new SupabaseRestError("Supabase no devolvio la fila creada.", 502, rows);
    return row;
  }

  async patch<T>(table: string, query: Record<string, string | number>, body: Record<string, unknown>) {
    const response = await this.fetchImpl(this.url(table, query), {
      method: "PATCH",
      headers: this.headers({ prefer: "return=representation" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const rows = await this.parseJson<T[]>(response);
    const row = rows[0];
    if (!row) throw new SupabaseRestError("Supabase no devolvio la fila actualizada.", 404, rows);
    return row;
  }

  async patchMany(
    table: string,
    query: Record<string, string | number>,
    body: Record<string, unknown>,
  ) {
    const response = await this.fetchImpl(this.url(table, query), {
      method: "PATCH",
      headers: this.headers({ prefer: "return=minimal" }),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) {
      await this.parseJson(response);
    }
  }

  private url(table: string, query: Record<string, string | number | undefined> = {}) {
    const url = new URL(`/rest/v1/${table}`, this.credentials.url);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url;
  }

  private headers(extra?: Record<string, string>) {
    const headers: Record<string, string> = {
      apikey: this.credentials.key,
      accept: "application/json",
      "content-type": "application/json",
      ...extra,
    };
    if (isLegacyJwtApiKey(this.credentials.key)) {
      headers.authorization = `Bearer ${this.credentials.key}`;
    }
    return headers;
  }

  private async parseJson<T>(response: Response): Promise<T> {
    const raw = await response.text();
    const parsed = raw ? safeJson(raw) : null;
    if (!response.ok) {
      throw new SupabaseRestError("Supabase devolvio un error.", response.status, parsed);
    }
    return parsed as T;
  }
}

function isLegacyJwtApiKey(key: string): boolean {
  return key.startsWith("eyJ") && key.split(".").length === 3;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
