// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { referral, reward } from "./fixtures";

const state = vi.hoisted(() => ({
  permissions: [] as string[],
  summary: null as unknown,
  enabled: [] as boolean[],
}));

vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => ({ permissions: state.permissions }),
}));
vi.mock("../referral-link-dialog", () => ({
  ReferralLinkDialog: ({ referred }: { referred: { name: string } }) => (
    <div role="dialog" aria-label={`Asociar a ${referred.name}`} />
  ),
}));
vi.mock("../referrals-data", () => ({
  usePatientReferralsQuery: (_id: string, enabled: boolean) => {
    state.enabled.push(enabled);
    return { data: state.summary, isError: false };
  },
}));

import { PatientReferralsCard } from "../patient-referrals-card";

const renderCard = () =>
  render(
    <MantineProvider env="test">
      <PatientReferralsCard patientId="p-ben" patientName="Ben Ruiz" />
    </MantineProvider>,
  );

afterEach(cleanup);
beforeEach(() => {
  state.permissions = ["referrals.read", "referrals.manage"];
  state.enabled = [];
});

describe("PatientReferralsCard", () => {
  it("muestra quién le recomendó, a quién recomendó y su crédito disponible", () => {
    state.summary = {
      referredBy: referral({ status: "CONFIRMED" }),
      referrals: [referral({ referred: { id: "p-cris", name: "Cris Gil", recordNumber: "103" } })],
      rewards: [reward({ state: "PARCIAL", remainingCents: 1800, appliedCount: 1 })],
    };
    renderCard();
    expect(screen.getByRole("link", { name: "Ana López" })).toHaveAttribute(
      "href",
      "/app/patients/p-ana",
    );
    expect(screen.getByText(/Ha recomendado a 1 paciente: Cris Gil/)).toBeInTheDocument();
    expect(screen.getByText(/1 beneficio disponible · 18,00/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Registrar quién le recomendó" })).toBeNull();
  });

  it("sin permiso de beneficios oculta los importes", () => {
    state.summary = { referredBy: null, referrals: [], rewards: null };
    renderCard();
    expect(screen.getByText("Sin recomendación registrada.")).toBeInTheDocument();
    expect(screen.queryByText(/beneficio/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Registrar quién le recomendó" }));
    expect(screen.getByRole("dialog", { name: "Asociar a Ben Ruiz" })).toBeInTheDocument();
  });

  it("no consulta ni muestra nada sin permiso", () => {
    state.permissions = [];
    renderCard();
    expect(screen.queryByRole("region")).toBeNull();
    expect(state.enabled[0]).toBe(false);
  });
});
