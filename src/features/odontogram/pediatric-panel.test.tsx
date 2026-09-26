// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PediatricPanel } from "./pediatric-panel";

describe("PediatricPanel", () => {
  it("uses FDI temporary numbering by default and lets the dentist switch to mixed dentition", () => {
    render(
      <MantineProvider>
        <PediatricPanel patientId="child-1" readOnly={false} onCommit={vi.fn()} />
      </MantineProvider>,
    );

    expect(screen.getByRole("radio", { name: "Temporal" })).toBeChecked();
    for (const tooth of ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"]) {
      expect(screen.getByTitle(new RegExp(`^${tooth} ·`))).toBeInTheDocument();
    }
    for (const tooth of ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"]) {
      expect(screen.getByTitle(new RegExp(`^${tooth} ·`))).toBeInTheDocument();
    }
    expect(screen.queryByTitle(/^11 ·/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Mixta" }));
    expect(screen.getByTitle(/^16 ·/)).toBeInTheDocument();
    expect(screen.getByTitle(/^55 ·/)).toBeInTheDocument();
  });
});
