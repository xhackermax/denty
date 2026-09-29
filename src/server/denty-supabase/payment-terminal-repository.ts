import type { SupabaseRestClient } from "../supabase/rest-client";
import {
  createStripeLocation,
  deleteStripeReader,
  listProviderReaders,
  pairSumUpReader,
  providerSetup,
  registerStripeReader,
  TerminalProviderError,
  unpairSumUpReader,
  type ProviderReader,
  type TerminalProvider,
} from "../payments/terminal-providers";

interface TerminalRow {
  id: string;
  provider: TerminalProvider | null;
  label: string;
  provider_terminal_id: string | null;
  site_id: string | null;
  device_model: string | null;
  status: string;
  created_at: string;
}
interface SiteRow {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  stripe_terminal_location_id: string | null;
}

export interface PaymentTerminal {
  id: string;
  provider: TerminalProvider;
  label: string;
  providerTerminalId: string;
  siteId: string | null;
  model: string | null;
  status: "online" | "offline" | "unknown";
}

function mapTerminal(row: TerminalRow, live?: ProviderReader): PaymentTerminal {
  return {
    id: row.id,
    provider: row.provider as TerminalProvider,
    label: row.label,
    providerTerminalId: row.provider_terminal_id ?? "",
    siteId: row.site_id,
    model: live?.model ?? row.device_model,
    status: live?.status ?? "unknown",
  };
}

/**
 * Card terminals of the clinic, stored in Denty (with their site) and mirrored
 * with the provider (SumUp / Stripe). Writes run with the admin's own session,
 * so row-level security keeps them inside the clinic.
 */
export class PaymentTerminalRepository {
  constructor(
    private readonly client: SupabaseRestClient,
    private readonly clinicId: string,
  ) {}

  private rows() {
    return this.client.select<TerminalRow>("payment_terminals", {
      select: "id,provider,label,provider_terminal_id,site_id,device_model,status,created_at",
      clinic_id: `eq.${this.clinicId}`,
      provider: "not.is.null",
      order: "created_at.asc",
    });
  }

  /** Terminals to charge with (reception): no provider round trip. */
  async listForCharging(): Promise<PaymentTerminal[]> {
    const setup = new Map(providerSetup().map((entry) => [entry.provider, entry.configured]));
    return (await this.rows())
      .filter((row) => row.provider && setup.get(row.provider))
      .map((row) => mapTerminal(row));
  }

  /** Administration view: key status per provider and live reader status. */
  async overview() {
    const setup = providerSetup();
    const rows = await this.rows();
    const live = new Map<string, ProviderReader>();
    const errors: Partial<Record<TerminalProvider, string>> = {};
    await Promise.all(
      setup
        .filter((entry) => entry.configured && rows.some((row) => row.provider === entry.provider))
        .map(async (entry) => {
          try {
            for (const reader of await listProviderReaders(entry.provider)) {
              live.set(`${entry.provider}:${reader.providerTerminalId}`, reader);
            }
          } catch (error) {
            errors[entry.provider] =
              error instanceof Error ? error.message : "No se pudo consultar el proveedor.";
          }
        }),
    );
    return {
      providers: setup.map((entry) => ({
        ...entry,
        ...(errors[entry.provider] ? { error: errors[entry.provider] } : {}),
      })),
      terminals: rows.map((row) =>
        mapTerminal(row, live.get(`${row.provider}:${row.provider_terminal_id}`)),
      ),
    };
  }

  private async site(siteId: string): Promise<SiteRow> {
    const [site] = await this.client.select<SiteRow>("sites", {
      select: "id,name,address,city,phone,stripe_terminal_location_id",
      id: `eq.${siteId}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    if (!site) throw new TerminalProviderError("La sede ya no existe.", 404);
    return site;
  }

  private async stripeLocationFor(site: SiteRow): Promise<string> {
    if (site.stripe_terminal_location_id) return site.stripe_terminal_location_id;
    const locationId = await createStripeLocation(site);
    await this.client.patchMany(
      "sites",
      { id: `eq.${site.id}`, clinic_id: `eq.${this.clinicId}` },
      { stripe_terminal_location_id: locationId },
    );
    return locationId;
  }

  async add(input: {
    provider: TerminalProvider;
    code: string;
    label: string;
    siteId: string;
  }): Promise<PaymentTerminal> {
    const site = await this.site(input.siteId);
    const reader =
      input.provider === "sumup"
        ? await pairSumUpReader(input.code, input.label)
        : await registerStripeReader({
            registrationCode: input.code,
            label: input.label,
            locationId: await this.stripeLocationFor(site),
          });
    try {
      const row = await this.client.insert<TerminalRow>("payment_terminals", {
        clinic_id: this.clinicId,
        provider: input.provider,
        label: input.label,
        provider_terminal_id: reader.providerTerminalId,
        site_id: site.id,
        device_model: reader.model,
        status: reader.status === "online" ? "online" : "unknown",
      });
      return mapTerminal(row, reader);
    } catch (error) {
      // Keep both sides consistent: a reader Denty could not store is released again.
      await this.release(input.provider, reader.providerTerminalId).catch(() => undefined);
      throw error;
    }
  }

  async update(
    id: string,
    input: { label?: string | undefined; siteId?: string | null | undefined },
  ) {
    if (input.siteId) await this.site(input.siteId);
    await this.client.patchMany(
      "payment_terminals",
      { id: `eq.${id}`, clinic_id: `eq.${this.clinicId}` },
      {
        ...(input.label ? { label: input.label } : {}),
        ...(input.siteId !== undefined ? { site_id: input.siteId } : {}),
        updated_at: new Date().toISOString(),
      },
    );
    return this.overview();
  }

  async remove(id: string) {
    const [row] = await this.client.select<TerminalRow>("payment_terminals", {
      select: "id,provider,label,provider_terminal_id,site_id,device_model,status,created_at",
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
      limit: 1,
    });
    if (!row) throw new TerminalProviderError("El datáfono ya no existe.", 404);
    if (row.provider && row.provider_terminal_id) {
      await this.release(row.provider, row.provider_terminal_id);
    }
    await this.client.delete("payment_terminals", {
      id: `eq.${id}`,
      clinic_id: `eq.${this.clinicId}`,
    });
    return this.overview();
  }

  private release(provider: TerminalProvider, providerTerminalId: string) {
    return provider === "sumup"
      ? unpairSumUpReader(providerTerminalId)
      : deleteStripeReader(providerTerminalId);
  }
}
