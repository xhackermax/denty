// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  type DoctorSpecialtyRow,
  sumSpecialtyCounts,
  TreatmentSpecialtyCharts,
} from "../treatment-specialty-charts";

afterEach(cleanup);

const doctors: DoctorSpecialtyRow[] = [
  { doctorId: "dr1", doctorName: "Dra. Ruiz", specialtyCounts: { endodontics: 3, implants: 1 } },
  { doctorId: "dr2", doctorName: "Dr. Gil", specialtyCounts: { orthodontics: 2, endodontics: 1 } },
];
const renderCharts = (rows: DoctorSpecialtyRow[]) =>
  render(
    <MantineProvider>
      <TreatmentSpecialtyCharts doctors={rows} />
    </MantineProvider>,
  );

describe("TreatmentSpecialtyCharts", () => {
  it("adds up every specialty across doctors, largest first", () => {
    renderCharts(doctors);
    expect(screen.getByText("7 en total")).toBeTruthy();
    const totals = within(screen.getByRole("list", { name: "Totales por especialidad" }))
      .getAllByRole("listitem")
      .map((row) => row.textContent);
    expect(totals).toEqual(["Endodoncia4 (57%)", "Ortodoncia2 (29%)", "Implantes1 (14%)"]);
  });

  it("compares doctors only when more than one has treatments", () => {
    renderCharts(doctors);
    expect(screen.getByLabelText("Reparto por doctor")).toBeTruthy();
    expect(screen.getByLabelText("Dra. Ruiz, Endodoncia: 3")).toBeTruthy();
    cleanup();
    renderCharts(doctors.slice(0, 1));
    expect(screen.queryByLabelText("Reparto por doctor")).toBeNull();
  });

  it("says so when there are no treatments", () => {
    renderCharts([{ doctorId: "dr1", doctorName: "Dra. Ruiz", specialtyCounts: {} }]);
    expect(screen.getByText("Sin tratamientos realizados en el periodo.")).toBeTruthy();
  });

  it("sums specialty counts", () => {
    expect(sumSpecialtyCounts(doctors)).toEqual({ endodontics: 4, implants: 1, orthodontics: 2 });
  });
});
