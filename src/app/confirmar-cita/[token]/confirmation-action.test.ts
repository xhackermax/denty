import { beforeEach, describe, expect, it, vi } from "vitest";

const confirm = vi.hoisted(() => vi.fn());

vi.mock("@/server/denty-supabase/appointment-confirmation", () => ({
  confirmAppointmentByToken: confirm,
}));

import { confirmAppointmentAction } from "./confirmation-action";

const idle = { status: "idle", message: "" } as const;
const token = "12345678-1234-1234-1234-123456789abc";

function form(value: unknown) {
  const data = new FormData();
  if (typeof value === "string") data.set("token", value);
  return data;
}

describe("appointment confirmation is explicit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("never executes a confirmation for an invalid token", async () => {
    expect((await confirmAppointmentAction(idle, form(""))).status).toBe("error");
    expect(confirm).not.toHaveBeenCalled();
  });

  it("executes the RPC only when the form action is submitted", async () => {
    confirm.mockResolvedValue({ ok: true });
    const result = await confirmAppointmentAction(idle, form(token));
    expect(confirm).toHaveBeenCalledExactlyOnceWith(token);
    expect(result.status).toBe("success");
  });

  it("shows the provider's failure rather than claiming confirmation", async () => {
    confirm.mockResolvedValue({ ok: false, code: "TOKEN_EXPIRED" });
    const result = await confirmAppointmentAction(idle, form(token));
    expect(result.status).toBe("error");
    expect(result.message).toContain("caducado");
  });

  it("handles unexpected service errors without exposing implementation details", async () => {
    confirm.mockRejectedValue(new Error("database private error"));
    const result = await confirmAppointmentAction(idle, form(token));
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("database");
  });
});
