const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PROVIDER_URL = Deno.env.get("DENTY_COMMUNICATION_PROVIDER_URL") ?? "";
const PROVIDER_TOKEN = Deno.env.get("DENTY_COMMUNICATION_PROVIDER_TOKEN") ?? "";

type Claimed = {
  outboxId: string;
  messageId: string;
  clinicId: string;
  patientId: string;
  channel: "WHATSAPP" | "SMS" | "EMAIL";
  category: string;
  subject?: string | null;
  body?: string | null;
  variables?: Record<string, unknown>;
  idempotencyKey: string;
  attemptCount: number;
};

async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${name}: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

function retryAt(attempt: number): string {
  const seconds = Math.min(3600, 60 * 2 ** Math.min(Math.max(attempt - 1, 0), 6));
  return new Date(Date.now() + seconds * 1000).toISOString();
}

Deno.serve(async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY)
    return new Response("Supabase service configuration missing", { status: 503 });
  if (!PROVIDER_URL)
    return new Response("Communication provider endpoint missing", { status: 503 });
  const claimed = await rpc<Claimed[]>("claim_communication_outbox", { p_limit: 20 });
  let sent = 0;
  let failed = 0;
  for (const item of claimed) {
    try {
      const response = await fetch(PROVIDER_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": item.idempotencyKey,
          ...(PROVIDER_TOKEN ? { authorization: `Bearer ${PROVIDER_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          messageId: item.messageId,
          patientId: item.patientId,
          channel: item.channel,
          category: item.category,
          subject: item.subject ?? undefined,
          body: item.body ?? undefined,
          variables: item.variables ?? {},
        }),
      });
      if (!response.ok) throw new Error(`provider ${response.status}: ${await response.text()}`);
      const providerResult = (await response.json().catch(() => ({}))) as {
        id?: string;
        messageId?: string;
      };
      await rpc("finish_communication_outbox", {
        p_outbox_id: item.outboxId,
        p_status: "SENT",
        p_provider_message_id: providerResult.id ?? providerResult.messageId ?? null,
        p_error: null,
        p_next_attempt_at: null,
      });
      sent += 1;
    } catch (error) {
      await rpc("finish_communication_outbox", {
        p_outbox_id: item.outboxId,
        p_status: "FAILED",
        p_provider_message_id: null,
        p_error: error instanceof Error ? error.message.slice(0, 1000) : "provider error",
        p_next_attempt_at: retryAt(item.attemptCount),
      });
      failed += 1;
    }
  }
  return Response.json({ claimed: claimed.length, sent, failed });
});
