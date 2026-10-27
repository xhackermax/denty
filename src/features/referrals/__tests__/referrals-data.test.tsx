// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  referrals: {
    list: vi.fn(),
    programs: vi.fn(),
    rewards: vi.fn(),
    redemptions: vi.fn(),
    patientSummary: vi.fn(),
    create: vi.fn(),
    confirm: vi.fn(),
    void: vi.fn(),
    reassign: vi.fn(),
    createProgram: vi.fn(),
    updateProgram: vi.fn(),
    approveReward: vi.fn(),
    cancelReward: vi.fn(),
    redeemReward: vi.fn(),
    reverseRedemption: vi.fn(),
  },
  agenda: { context: vi.fn() },
}));
vi.mock("@/shared/api/browser", () => ({ getBrowserApi: () => api }));

import {
  useCreateReferralMutation,
  usePatientReferralsQuery,
  useReferralChangeMutation,
  useReferralListQuery,
  useReferralProgramsQuery,
  useReferralRedemptionsQuery,
  useReferralRewardsQuery,
  useReferralSitesQuery,
  useRewardChangeMutation,
  useSaveReferralProgramMutation,
} from "../referrals-data";

let client: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  for (const fn of Object.values(api.referrals)) fn.mockReset().mockResolvedValue({ items: [] });
});

describe("referrals data hooks", () => {
  it("consulta listas, programas, ficha y movimientos", async () => {
    renderHook(() => useReferralListQuery({ status: "PENDING" }), { wrapper });
    renderHook(() => useReferralProgramsQuery(), { wrapper });
    renderHook(() => useReferralRewardsQuery({ state: "USADO" }), { wrapper });
    renderHook(() => usePatientReferralsQuery("p1"), { wrapper });
    const idle = renderHook(() => useReferralRedemptionsQuery(null), { wrapper });
    renderHook(() => useReferralRedemptionsQuery("w1"), { wrapper });
    await waitFor(() => expect(api.referrals.redemptions).toHaveBeenCalledWith("w1"));
    expect(api.referrals.list).toHaveBeenCalledWith({ status: "PENDING" });
    expect(api.referrals.programs).toHaveBeenCalled();
    expect(api.referrals.rewards).toHaveBeenCalledWith({ state: "USADO" });
    expect(api.referrals.patientSummary).toHaveBeenCalledWith("p1");
    expect(idle.result.current.fetchStatus).toBe("idle");
  });

  it("solo ofrece sedes activas", async () => {
    api.agenda.context.mockResolvedValue({
      sites: [
        { id: "s1", name: "Centro", active: true },
        { id: "s2", name: "Cerrada", active: false },
      ],
      staff: [],
    });
    const { result } = renderHook(() => useReferralSitesQuery(), { wrapper });
    await waitFor(() =>
      expect(result.current.data).toEqual([{ id: "s1", name: "Centro", active: true }]),
    );
  });

  it("dirige cada cambio de relación a su llamada y refresca todo", async () => {
    const invalidate = vi.spyOn(client, "invalidateQueries");
    const create = renderHook(() => useCreateReferralMutation(), { wrapper });
    const change = renderHook(() => useReferralChangeMutation(), { wrapper });
    await act(async () => {
      await create.result.current.mutateAsync({
        referrerPatientId: "a",
        referredPatientId: "b",
        source: "OTRO",
      });
      await change.result.current.mutateAsync({
        action: "confirm",
        referralId: "r",
        expectedVersion: 1,
      });
      await change.result.current.mutateAsync({
        action: "void",
        referralId: "r",
        expectedVersion: 2,
        reason: "Error",
      });
      await change.result.current.mutateAsync({
        action: "reassign",
        referralId: "r",
        expectedVersion: 3,
        reason: "Otro",
        newReferrerPatientId: "c",
      });
    });
    expect(api.referrals.confirm).toHaveBeenCalledWith("r", { expectedVersion: 1 });
    expect(api.referrals.void).toHaveBeenCalledWith("r", { expectedVersion: 2, reason: "Error" });
    expect(api.referrals.reassign).toHaveBeenCalledWith("r", {
      expectedVersion: 3,
      reason: "Otro",
      newReferrerPatientId: "c",
    });
    expect(invalidate).toHaveBeenCalledTimes(4);
  });

  it("guarda programas y mueve el libro de beneficios", async () => {
    const save = renderHook(() => useSaveReferralProgramMutation(), { wrapper });
    const rewards = renderHook(() => useRewardChangeMutation(), { wrapper });
    const program = { name: "P" } as never;
    await act(async () => {
      await save.result.current.mutateAsync({ programId: null, program });
      await save.result.current.mutateAsync({ programId: "g1", program, expectedVersion: 4 });
      await rewards.result.current.mutateAsync({
        action: "approve",
        rewardId: "w1",
        expectedVersion: 1,
        reference: null,
      });
      await rewards.result.current.mutateAsync({
        action: "cancel",
        rewardId: "w1",
        expectedVersion: 2,
        reason: "Duplicado",
      });
      await rewards.result.current.mutateAsync({
        action: "redeem",
        rewardId: "w1",
        input: { idempotencyKey: "key-12345" },
      });
      await rewards.result.current.mutateAsync({
        action: "reverse",
        redemptionId: "d1",
        reason: "Error",
      });
    });
    expect(api.referrals.createProgram).toHaveBeenCalledWith(program);
    expect(api.referrals.updateProgram).toHaveBeenCalledWith("g1", { program, expectedVersion: 4 });
    expect(api.referrals.approveReward).toHaveBeenCalledWith("w1", {
      reference: null,
      expectedVersion: 1,
    });
    expect(api.referrals.cancelReward).toHaveBeenCalledWith("w1", {
      reason: "Duplicado",
      expectedVersion: 2,
    });
    expect(api.referrals.redeemReward).toHaveBeenCalledWith("w1", { idempotencyKey: "key-12345" });
    expect(api.referrals.reverseRedemption).toHaveBeenCalledWith("d1", { reason: "Error" });
  });
});
