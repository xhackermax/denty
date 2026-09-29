import type Stripe from "stripe";

import { getStripeClient, stripeRequestOptions } from "./stripe-client";

/**
 * Connected card terminals, set up from Administración › Cobros y datáfonos:
 * - SumUp Solo: paired with the code the reader shows (Cloud API).
 * - Stripe Terminal: registered with the reader's registration code and placed in
 *   a Stripe "location", one per site (created from the site's address).
 * Keys live in the server environment (Vercel, "Sensitive"); nothing secret is
 * ever sent to the browser.
 */

export type TerminalProvider = "sumup" | "stripe";

export interface ProviderSetup {
  provider: TerminalProvider;
  configured: boolean;
  /** Names of the environment variables still to add (never their values). */
  missing: string[];
}

export interface ProviderReader {
  providerTerminalId: string;
  label: string;
  status: "online" | "offline" | "unknown";
  model: string | null;
}

type Env = Readonly<Record<string, string | undefined>>;

const SUMUP_API_BASE = "https://api.sumup.com";

export class TerminalProviderError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function providerSetup(env: Env = process.env): ProviderSetup[] {
  const missing = (names: string[]) => names.filter((name) => !env[name]?.trim());
  const sumup = missing(["SUMUP_API_KEY", "SUMUP_MERCHANT_CODE"]);
  const stripe = missing(["STRIPE_SECRET_KEY"]);
  return [
    { provider: "sumup", configured: !sumup.length, missing: sumup },
    { provider: "stripe", configured: !stripe.length, missing: stripe },
  ];
}

function requireConfigured(provider: TerminalProvider, env: Env = process.env) {
  const setup = providerSetup(env).find((entry) => entry.provider === provider);
  if (!setup?.configured) {
    throw new TerminalProviderError(
      `Faltan las claves de ${provider === "sumup" ? "SumUp" : "Stripe"} en el servidor: ${setup?.missing.join(", ")}.`,
      409,
    );
  }
}

function stripeAccount(env: Env = process.env) {
  return env.STRIPE_CONNECTED_ACCOUNT_ID ?? env.STRIPE_DEFAULT_CONNECTED_ACCOUNT_ID;
}

// ---------------------------------------------------------------------------
// SumUp
// ---------------------------------------------------------------------------

async function sumup(path: string, init?: RequestInit): Promise<Record<string, unknown>> {
  requireConfigured("sumup");
  const merchant = encodeURIComponent(process.env.SUMUP_MERCHANT_CODE!.trim());
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/merchants/${merchant}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.SUMUP_API_KEY!.trim()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (response.status === 204) return {};
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new TerminalProviderError("SumUp rechaza la clave: revisa SUMUP_API_KEY.", 502);
    }
    const detail =
      typeof body.detail === "string" ? body.detail : `SumUp respondió ${response.status}`;
    throw new TerminalProviderError(detail, response.status >= 500 ? 502 : 400);
  }
  return body;
}

function sumupReader(raw: Record<string, unknown>): ProviderReader {
  const device = (raw.device ?? {}) as { model?: string };
  const status = String(raw.status ?? "");
  return {
    providerTerminalId: String(raw.id ?? ""),
    label: String(raw.name ?? "Lector SumUp"),
    // "paired" is the only usable state; SumUp does not expose live connectivity here.
    status: status === "paired" ? "online" : status ? "offline" : "unknown",
    model: device.model ?? null,
  };
}

export async function listSumUpReaders(): Promise<ProviderReader[]> {
  const body = await sumup("/readers");
  const items = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  return items.map(sumupReader);
}

/** Pairs a SumUp Solo using the code shown on its screen (Conexiones › API). */
export async function pairSumUpReader(pairingCode: string, label: string): Promise<ProviderReader> {
  const body = await sumup("/readers", {
    method: "POST",
    body: JSON.stringify({ pairing_code: pairingCode.trim().toUpperCase(), name: label }),
  });
  return sumupReader(body);
}

export async function unpairSumUpReader(readerId: string): Promise<void> {
  try {
    await sumup(`/readers/${encodeURIComponent(readerId)}`, { method: "DELETE" });
  } catch (error) {
    // Already removed on SumUp's side: nothing left to undo.
    if (!(error instanceof TerminalProviderError && /404|not found/i.test(error.message)))
      throw error;
  }
}

// ---------------------------------------------------------------------------
// Stripe Terminal
// ---------------------------------------------------------------------------

function stripeReader(reader: Stripe.Terminal.Reader): ProviderReader {
  return {
    providerTerminalId: reader.id,
    label: reader.label ?? "Lector Stripe",
    status:
      reader.status === "online" ? "online" : reader.status === "offline" ? "offline" : "unknown",
    model: reader.device_type ?? null,
  };
}

function stripeError(error: unknown): never {
  const stripe = error as { type?: string; message?: string; code?: string };
  if (stripe?.type === "StripeAuthenticationError") {
    throw new TerminalProviderError("Stripe rechaza la clave: revisa STRIPE_SECRET_KEY.", 502);
  }
  if (stripe?.message) throw new TerminalProviderError(stripe.message, 400);
  throw error;
}

export interface SiteAddress {
  name: string;
  address: string | null;
  city: string | null;
  phone?: string | null;
}

/**
 * Stripe needs a structured address for a Terminal location. Denty keeps a single
 * line ("Avenida de Navarra 17, local bajo, 50010"): the postcode is the 5-digit
 * group, the rest is the street line. Spain by default.
 */
export function stripeAddressFromSite(
  site: SiteAddress,
): Stripe.Terminal.LocationCreateParams.Address {
  const address = site.address?.trim() ?? "";
  const postal = /\b(\d{5})\b/.exec(address)?.[1];
  const line1 = address
    .replace(/\b\d{5}\b/, "")
    .replace(/[,\s]+$/, "")
    .replace(/,\s*,/g, ",")
    .trim();
  if (!line1 || !site.city?.trim()) {
    throw new TerminalProviderError(
      `Completa la dirección y la ciudad de la sede «${site.name}» en Sedes y doctores antes de añadir un lector Stripe.`,
    );
  }
  return {
    line1,
    city: site.city.trim(),
    country: "ES",
    ...(postal ? { postal_code: postal } : {}),
  };
}

export async function createStripeLocation(site: SiteAddress): Promise<string> {
  requireConfigured("stripe");
  const stripe = getStripeClient();
  try {
    const location = await stripe.terminal.locations.create(
      {
        display_name: site.name,
        address: stripeAddressFromSite(site),
        ...(site.phone ? { phone: site.phone } : {}),
      },
      stripeRequestOptions(stripeAccount()),
    );
    return location.id;
  } catch (error) {
    if (error instanceof TerminalProviderError) throw error;
    return stripeError(error);
  }
}

export async function registerStripeReader(input: {
  registrationCode: string;
  label: string;
  locationId: string;
}): Promise<ProviderReader> {
  requireConfigured("stripe");
  try {
    const reader = await getStripeClient().terminal.readers.create(
      {
        registration_code: input.registrationCode.trim(),
        label: input.label,
        location: input.locationId,
      },
      stripeRequestOptions(stripeAccount()),
    );
    return stripeReader(reader);
  } catch (error) {
    return stripeError(error);
  }
}

export async function listStripeReaders(): Promise<ProviderReader[]> {
  requireConfigured("stripe");
  try {
    const readers = await getStripeClient().terminal.readers.list(
      { limit: 100 },
      stripeRequestOptions(stripeAccount()),
    );
    return readers.data.map(stripeReader);
  } catch (error) {
    return stripeError(error);
  }
}

export async function deleteStripeReader(readerId: string): Promise<void> {
  requireConfigured("stripe");
  try {
    await getStripeClient().terminal.readers.del(
      readerId,
      {},
      stripeRequestOptions(stripeAccount()),
    );
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "resource_missing") return;
    stripeError(error);
  }
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export async function listProviderReaders(provider: TerminalProvider) {
  return provider === "sumup" ? listSumUpReaders() : listStripeReaders();
}

/** "Probar conexión": one read-only call that proves the keys work. */
export async function testProviderConnection(
  provider: TerminalProvider,
): Promise<{ ok: true; message: string }> {
  const readers = await listProviderReaders(provider);
  const name = provider === "sumup" ? "SumUp" : "Stripe";
  return {
    ok: true,
    message: `Conectado con ${name}: ${readers.length} ${readers.length === 1 ? "lector" : "lectores"} en la cuenta.`,
  };
}
