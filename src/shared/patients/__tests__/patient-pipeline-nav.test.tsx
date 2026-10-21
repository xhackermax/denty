// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PatientPipelineFrame,
  PatientPipelineFromQuery,
  PatientPipelineNav,
  PatientPipelineStepper,
} from "../patient-pipeline-nav";

const searchParams = vi.hoisted(() => ({ current: new URLSearchParams() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => searchParams.current }));

afterEach(cleanup);

function wrap(node: ReactNode) {
  return render(<MantineProvider>{node}</MantineProvider>);
}

describe("PatientPipelineNav", () => {
  it("links every step of the patient and marks the current one", () => {
    wrap(<PatientPipelineNav patientId="p1" current="budget" />);
    const nav = screen.getByRole("navigation", { name: "Pasos del paciente" });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Odontograma/ })).toHaveAttribute(
      "href",
      "/app/patients/p1/odontogram",
    );
    expect(screen.getByRole("link", { name: /Presupuesto/ })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(screen.getByRole("link", { name: /Citas/ })).not.toHaveAttribute("aria-current");
  });

  it("marks no step when shown outside a step page", () => {
    wrap(<PatientPipelineNav patientId="p1" />);
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(
      screen.getAllByRole("link").filter((link) => link.hasAttribute("aria-current")),
    ).toHaveLength(0);
  });
});

describe("PatientPipelineStepper", () => {
  it("offers the previous and next step from the middle", () => {
    wrap(<PatientPipelineStepper patientId="p1" current="plan" />);
    expect(screen.getByRole("link", { name: "Anterior: Odontograma" })).toHaveAttribute(
      "href",
      "/app/patients/p1/odontogram",
    );
    expect(screen.getByRole("link", { name: "Siguiente: Presupuesto" })).toHaveAttribute(
      "href",
      "/app/patients/p1?view=budgets",
    );
  });

  it("only offers the next step on the first step", () => {
    wrap(<PatientPipelineStepper patientId="p1" current="odontogram" />);
    expect(screen.queryByRole("link", { name: /^Anterior/ })).toBeNull();
    expect(
      screen.getByRole("link", { name: "Siguiente: Plan de tratamiento" }),
    ).toBeInTheDocument();
  });

  it("only offers the previous step on the last step", () => {
    wrap(<PatientPipelineStepper patientId="p1" current="appointments" />);
    expect(screen.getByRole("link", { name: "Anterior: Documentos" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^Siguiente/ })).toBeNull();
  });
});

describe("PatientPipelineFrame", () => {
  it("surrounds the step content with the steps and the corner buttons", () => {
    wrap(
      <PatientPipelineFrame patientId="p1" current="documents">
        <p>Contenido</p>
      </PatientPipelineFrame>,
    );
    expect(screen.getByText("Contenido")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Pasos del paciente" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Anterior: Presupuesto" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Siguiente: Citas" })).toBeInTheDocument();
  });
});

describe("PatientPipelineFromQuery", () => {
  it("shows the pipeline when the page is opened from a patient", () => {
    searchParams.current = new URLSearchParams("patientId=p9");
    wrap(
      <PatientPipelineFromQuery current="appointments">
        <p>Agenda</p>
      </PatientPipelineFromQuery>,
    );
    expect(screen.getByRole("link", { name: "Anterior: Documentos" })).toHaveAttribute(
      "href",
      "/app/documents?patientId=p9",
    );
  });

  it("leaves the general page untouched without a patient", () => {
    searchParams.current = new URLSearchParams();
    wrap(
      <PatientPipelineFromQuery current="appointments">
        <p>Agenda</p>
      </PatientPipelineFromQuery>,
    );
    expect(screen.getByText("Agenda")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Pasos del paciente" })).toBeNull();
  });
});
