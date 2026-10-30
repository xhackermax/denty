import { describe, expect, test } from "vitest";

import { SupabaseRestClient } from "../../supabase/rest-client";
import { handleFeedbackNotesRoute, isFeedbackNotesRoute } from "../feedback-notes-route";

type Call = { path: string; search: string; body: Record<string, unknown> | null };

function fakeClient(respond: (call: Call) => Response | unknown = () => ({})) {
  const calls: Call[] = [];
  const client = new SupabaseRestClient(
    { url: "https://example.supabase.co", key: "test" },
    async (input, init) => {
      const url = new URL(String(input));
      const call = {
        path: url.pathname.replace("/rest/v1/", ""),
        search: url.search,
        body: init?.body ? JSON.parse(String(init.body)) : null,
      };
      calls.push(call);
      const result = respond(call);
      return result instanceof Response ? result : Response.json(result);
    },
  );
  return { client, calls };
}

const identity = (role: string, client: SupabaseRestClient) => ({
  actor: { clinicId: "clinic-1", role },
  restClient: client,
});

const call = (method: string, path: string, body?: unknown) => {
  const request = new Request(`https://denty.example${path}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { request, parts: new URL(request.url).pathname.split("/").filter(Boolean) };
};

const row = {
  id: "n-1",
  kind: "BUG",
  message: "El botón de guardar no responde",
  page_path: "/app/agenda",
  status: "NEW",
  author_id: "u-1",
  author_name: "Ana Pérez",
  created_at: "2026-10-30T10:00:00.000Z",
  updated_at: "2026-10-30T10:00:00.000Z",
};

describe("feedback notes route", () => {
  test("matches only /api/feedback-notes", () => {
    expect(isFeedbackNotesRoute(["api", "feedback-notes"])).toBe(true);
    expect(isFeedbackNotesRoute(["api", "recalls"])).toBe(false);
  });

  test("requires a session and rejects patients", async () => {
    const { client } = fakeClient();
    const { request, parts } = call("GET", "/api/feedback-notes");
    expect((await handleFeedbackNotesRoute(request, parts, null)).status).toBe(401);
    const asPatient = call("GET", "/api/feedback-notes");
    const response = await handleFeedbackNotesRoute(
      asPatient.request,
      asPatient.parts,
      identity("PATIENT", client),
    );
    expect(response.status).toBe(403);
  });

  test("lists the clinic notes, newest first", async () => {
    const { client, calls } = fakeClient(() => [row]);
    const { request, parts } = call("GET", "/api/feedback-notes");
    const response = await handleFeedbackNotesRoute(request, parts, identity("RECEPTION", client));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: "n-1",
        kind: "BUG",
        message: "El botón de guardar no responde",
        pagePath: "/app/agenda",
        status: "NEW",
        authorId: "u-1",
        authorName: "Ana Pérez",
        createdAt: "2026-10-30T10:00:00.000Z",
        updatedAt: "2026-10-30T10:00:00.000Z",
      },
    ]);
    expect(calls[0]?.path).toBe("feedback_notes");
    const query = new URLSearchParams(calls[0]?.search);
    expect(query.get("clinic_id")).toBe("eq.clinic-1");
    expect(query.get("order")).toBe("created_at.desc");
  });

  test("any staff role creates a note through the RPC", async () => {
    const { client, calls } = fakeClient(() => row);
    const { request, parts } = call("POST", "/api/feedback-notes", {
      kind: "BUG",
      message: "  El botón de guardar no responde  ",
      pagePath: "/app/agenda",
    });
    const response = await handleFeedbackNotesRoute(request, parts, identity("ASSISTANT", client));
    expect(response.status).toBe(201);
    expect(calls[0]).toMatchObject({
      path: "rpc/create_feedback_note",
      body: {
        p_clinic_id: "clinic-1",
        p_kind: "BUG",
        p_message: "El botón de guardar no responde",
        p_page_path: "/app/agenda",
      },
    });
  });

  test("rejects an empty note before calling the database", async () => {
    const { client, calls } = fakeClient();
    const { request, parts } = call("POST", "/api/feedback-notes", {
      kind: "IDEA",
      message: " ",
      pagePath: null,
    });
    const response = await handleFeedbackNotesRoute(request, parts, identity("DENTIST", client));
    expect(response.status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  test("only admins change the status", async () => {
    const { client, calls } = fakeClient(() => ({ ...row, status: "DONE" }));
    const asDentist = call("POST", "/api/feedback-notes/n-1/status", { status: "DONE" });
    expect(
      (
        await handleFeedbackNotesRoute(
          asDentist.request,
          asDentist.parts,
          identity("DENTIST", client),
        )
      ).status,
    ).toBe(403);
    expect(calls).toHaveLength(0);

    const asAdmin = call("POST", "/api/feedback-notes/n-1/status", { status: "DONE" });
    const response = await handleFeedbackNotesRoute(
      asAdmin.request,
      asAdmin.parts,
      identity("ADMIN", client),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("DONE");
    expect(calls[0]).toMatchObject({
      path: "rpc/update_feedback_note_status",
      body: { p_note_id: "n-1", p_status: "DONE" },
    });
  });

  test("maps database rule errors", async () => {
    const { client } = fakeClient(() =>
      Response.json({ message: "FEEDBACK_NOTE_NOT_FOUND", code: "P0002" }, { status: 400 }),
    );
    const { request, parts } = call("POST", "/api/feedback-notes/missing/status", {
      status: "DONE",
    });
    const response = await handleFeedbackNotesRoute(request, parts, identity("ADMIN", client));
    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("FEEDBACK_NOTE_NOT_FOUND");
  });

  test("answers 404 for unknown routes", async () => {
    const { client } = fakeClient();
    const { request, parts } = call("DELETE", "/api/feedback-notes/n-1");
    expect((await handleFeedbackNotesRoute(request, parts, identity("ADMIN", client))).status).toBe(
      404,
    );
  });
});
