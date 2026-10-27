// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { program, referral, reward } from "./fixtures";

const tenant = vi.hoisted(() => ({ permissions: [] as string[] }));
const data = vi.hoisted(() => ({
  referrals: [] as unknown[],
  rewards: [] as unknown[],
  programs: [] as unknown[],
}));
const mutations = vi.hoisted(() => ({ change: vi.fn(), reward: vi.fn(), create: vi.fn() }));

vi.mock("@/shared/tenancy/active-context", () => ({ useActiveTenant: () => tenant }));
vi.mock("@/shared/patients/patient-data", () => ({
  usePatientsQuery: () => ({
    data: {
      items: [
        { id: "p-cris", firstName: "Cris", lastName: "Gil", recordNumber: "103" },
        { id: "p-ben", firstName: "Ben", lastName: "Ruiz", recordNumber: "102" },
      ],
    },
    isError: false,
  }),
}));
vi.mock("../referral-program-form", () => ({
  ReferralProgramForm: ({ program: edited }: { program: { name: string } | null }) => (
    <div role="dialog" aria-label={edited ? `Editar ${edited.name}` : "Nuevo programa"} />
  ),
}));
vi.mock("../referrals-data", () => ({
  useReferralListQuery: () => ({
    data: {
      total: data.referrals.length,
      kpis: {
        activeReferrers: 1,
        referred: 2,
        confirmed: 1,
        withAppointments: 1,
        rewardsPending: 0,
        rewardsUsed: 0,
      },
      items: data.referrals,
    },
    isError: false,
    isLoading: false,
  }),
  useReferralProgramsQuery: () => ({ data: { items: data.programs } }),
  useReferralSitesQuery: () => ({ data: [] }),
  useReferralRewardsQuery: () => ({
    data: {
      total: data.rewards.length,
      kpis: { pending: 0, earned: 1, used: 0, expired: 0, creditRemainingCents: 3000 },
      items: data.rewards,
    },
    isError: false,
  }),
  useReferralRedemptionsQuery: () => ({ data: { items: [] }, isError: false }),
  useReferralChangeMutation: () => ({ mutate: mutations.change, isPending: false, error: null }),
  useRewardChangeMutation: () => ({ mutate: mutations.reward, isPending: false, error: null }),
  useCreateReferralMutation: () => ({ mutate: mutations.create, isPending: false, error: null }),
}));

import { ReferralsModule } from "../referrals-module";

const RECEPTION = [
  "referrals.read",
  "referrals.manage",
  "referral_rewards.read",
  "referral_rewards.redeem",
];
const ADMIN = [
  ...RECEPTION,
  "referral_programs.manage",
  "referral_rewards.approve",
  "referral_rewards.reverse",
];

const renderModule = () =>
  render(
    <MantineProvider env="test">
      <ReferralsModule />
    </MantineProvider>,
  );

const open = async (section: string, visible: string) => {
  fireEvent.click(screen.getByRole("button", { name: section }));
  return screen.findByRole("button", { name: visible });
};

afterEach(cleanup);
beforeEach(() => {
  tenant.permissions = ADMIN;
  data.referrals = [referral(), referral({ id: "r2", status: "CONFIRMED", version: 1 })];
  data.rewards = [reward()];
  data.programs = [program()];
  for (const fn of Object.values(mutations)) fn.mockReset();
});

describe("ReferralsModule", () => {
  it("muestra los indicadores y quién recomendó a quién con enlace a las fichas", () => {
    renderModule();
    expect(screen.getByText("Citas obtenidas").nextSibling).toHaveTextContent("1");
    expect(screen.getAllByRole("link", { name: "Ana López" })[0]).toHaveAttribute(
      "href",
      "/app/patients/p-ana",
    );
  });

  it("confirma una relación pendiente con su versión", () => {
    renderModule();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Acciones para Ana López → Ben Ruiz" })[0]!,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Confirmar referido" }));
    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Confirmar referido" }),
    );
    expect(mutations.change).toHaveBeenCalledWith(
      { referralId: "r1", expectedVersion: 3, action: "confirm" },
      expect.anything(),
    );
  });

  it("anular exige motivo y avisa de los beneficios de una confirmada", () => {
    renderModule();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Acciones para Ana López → Ben Ruiz" })[1]!,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Anular relación" }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveTextContent("Se cancelarán sus beneficios no usados.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Anular relación" }));
    expect(mutations.change).not.toHaveBeenCalled();
    expect(within(dialog).getByText("Indica el motivo.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), { target: { value: "Duplicado" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Anular relación" }));
    expect(mutations.change).toHaveBeenCalledWith(
      { referralId: "r2", expectedVersion: 1, action: "void", reason: "Duplicado" },
      expect.anything(),
    );
  });

  it("cambia quién recomienda eligiendo otro paciente", async () => {
    renderModule();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Acciones para Ana López → Ben Ruiz" })[0]!,
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Cambiar quién recomienda" }));
    const dialog = screen.getByRole("dialog");
    const select = within(dialog).getByLabelText(/^Quién recomienda en realidad/, {
      selector: "input",
    });
    fireEvent.click(select);
    fireEvent.change(select, { target: { value: "Cris" } });
    fireEvent.click(await screen.findByRole("option", { name: /Cris Gil/ }, { timeout: 2000 }));
    expect(
      screen.queryByRole("option", { name: /Ben Ruiz/ }),
      "the referred is excluded",
    ).toBeNull();
    fireEvent.change(within(dialog).getByLabelText(/Motivo/), {
      target: { value: "Se confundió" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cambiar quién recomienda" }));
    expect(mutations.change).toHaveBeenCalledWith(
      {
        referralId: "r1",
        expectedVersion: 3,
        action: "reassign",
        reason: "Se confundió",
        newReferrerPatientId: "p-cris",
      },
      expect.anything(),
    );
  });

  it("recepción no gestiona programas ni anula relaciones confirmadas", async () => {
    tenant.permissions = RECEPTION;
    renderModule();
    expect(screen.getAllByRole("button", { name: /Acciones para/ })).toHaveLength(1);
    await open("Programas", "Programas");
    expect(screen.queryByRole("button", { name: "Nuevo programa" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar" })).toBeNull();
  });

  it("solo lectura: sin acciones ni beneficios", () => {
    tenant.permissions = ["referrals.read"];
    renderModule();
    expect(screen.queryByRole("button", { name: "Asociar pacientes" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Acciones para/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Beneficios" })).toBeNull();
  });

  it("abre el alta de asociación y los formularios de programa", async () => {
    renderModule();
    fireEvent.click(screen.getByRole("button", { name: "Asociar pacientes" }));
    expect(screen.getByRole("dialog", { name: "Asociar paciente referido" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await open("Programas", "Nuevo programa");
    expect(screen.getByText(/Quien recomienda: Crédito de 30,00/)).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("dialog", { name: "Editar Recomienda" })).toBeInTheDocument();
  });

  it("muestra los beneficios y deja canjear crédito sin pasarse del saldo", async () => {
    renderModule();
    await open("Beneficios", "Acciones del beneficio de Ana López");
    expect(screen.getByText("Crédito restante").nextSibling).toHaveTextContent("30,00");
    fireEvent.click(screen.getByRole("button", { name: "Acciones del beneficio de Ana López" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Canjear" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Importe a usar/), { target: { value: "45" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Canjear" }));
    expect(within(dialog).getByText("Supera el crédito disponible.")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText(/Importe a usar/), {
      target: { value: "12,5" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Canjear" }));
    expect(mutations.reward).toHaveBeenCalledWith(
      {
        action: "redeem",
        rewardId: "w1",
        input: { amountCents: 1250, reason: null, idempotencyKey: expect.any(String) },
      },
      expect.anything(),
    );
  });

  it("validar un beneficio de un programa no manual pide la prueba", async () => {
    data.rewards = [
      reward({ state: "PENDIENTE", status: "PENDING", qualification: "PRIMER_PAGO_CONFIRMADO" }),
    ];
    renderModule();
    await open("Beneficios", "Acciones del beneficio de Ana López");
    fireEvent.click(screen.getByRole("button", { name: "Acciones del beneficio de Ana López" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Validar cumplimiento" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Validar cumplimiento" }));
    expect(mutations.reward).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText("Prueba de cumplimiento"), {
      target: { value: "Pago 2026-118" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Validar cumplimiento" }));
    expect(mutations.reward).toHaveBeenCalledWith(
      { action: "approve", rewardId: "w1", expectedVersion: 2, reference: "Pago 2026-118" },
      expect.anything(),
    );
  });
});
