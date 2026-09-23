import { z } from "zod";

import { apiErrorEnvelopeSchema } from "./contracts";
import { DentyApiError, kindFromStatus } from "./errors";

export interface ApiRequestOptions<TBody = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  headers?: HeadersInit;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export interface ApiClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function makeIdempotencyKey(): string {
  return `denty-${crypto.randomUUID()}`;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  createIdempotencyKey(): string {
    return makeIdempotencyKey();
  }

  async request<TOutput, TBody = unknown>(
    path: string,
    schema: z.ZodType<TOutput>,
    options: ApiRequestOptions<TBody> = {},
  ): Promise<TOutput> {
    const response = await this.execute(path, options);
    const raw = await response.text();
    const parsed = raw ? safeJson(raw) : null;
    const result = schema.safeParse(parsed);

    if (!result.success) {
      throw new DentyApiError(
        "invalid_response",
        "La respuesta de Denty API no cumple el contrato.",
        {
          status: response.status,
          correlationId: response.headers.get("x-correlation-id") ?? undefined,
          details: result.error.flatten(),
        },
      );
    }
    return result.data;
  }

  async requestText<TBody = unknown>(
    path: string,
    options: ApiRequestOptions<TBody> = {},
  ): Promise<string> {
    const response = await this.execute(path, options);
    return response.text();
  }

  async requestBlob<TBody = unknown>(
    path: string,
    options: ApiRequestOptions<TBody> = {},
  ): Promise<Blob> {
    const response = await this.execute(path, options);
    return response.blob();
  }

  async mutation<TOutput, TBody>(
    path: string,
    schema: z.ZodType<TOutput>,
    body: TBody,
    options: Omit<ApiRequestOptions<TBody>, "body" | "method"> & {
      method?: "POST" | "PUT" | "PATCH" | "DELETE";
    } = {},
  ): Promise<TOutput> {
    return this.request(path, schema, {
      ...options,
      method: options.method ?? "POST",
      body,
      idempotencyKey: options.idempotencyKey ?? makeIdempotencyKey(),
    });
  }

  private async execute<TBody>(path: string, options: ApiRequestOptions<TBody>): Promise<Response> {
    const method = options.method ?? "GET";
    const headers = new Headers(options.headers);
    if (!headers.has("accept")) headers.set("accept", "application/json");

    let body: BodyInit | undefined;
    if (options.body !== undefined) {
      headers.set("content-type", "application/json");
      body = JSON.stringify(options.body);
    }

    if (options.idempotencyKey) {
      headers.set("idempotency-key", options.idempotencyKey);
    }

    const requestInit: RequestInit = {
      method,
      headers,
      credentials: "include",
    };
    if (body !== undefined) requestInit.body = body;
    if (options.signal !== undefined) requestInit.signal = options.signal;

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, requestInit);
    } catch (cause) {
      throw new DentyApiError("network", "No se pudo conectar con Denty API.", { cause });
    }

    if (!response.ok) {
      await throwResponseError(response);
    }
    return response;
  }
}

async function throwResponseError(response: Response): Promise<never> {
  const correlationId = response.headers.get("x-correlation-id") ?? undefined;
  const raw = await response.text();
  const parsed = raw ? safeJson(raw) : null;
  const envelope = apiErrorEnvelopeSchema.safeParse(parsed);

  if (envelope.success) {
    throw new DentyApiError(kindFromStatus(response.status), envelope.data.error.message, {
      status: response.status,
      code: envelope.data.error.code,
      correlationId: envelope.data.error.correlationId ?? correlationId,
      details: envelope.data.error.details ?? parsed,
    });
  }

  throw new DentyApiError(
    kindFromStatus(response.status),
    `Denty API devolvió ${response.status}.`,
    {
      status: response.status,
      correlationId,
      details: parsed,
    },
  );
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
