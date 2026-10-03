// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NextSlotFinder, type NextSlotFinderApi } from "../next-slot-finder";

afterEach(cleanup);

const slot = (startsAt: string, staffId = "ana", staffName = "Dra. Ana") => ({
  startsAt,
  endsAt: startsAt,
  staffId,
  staffName,
});

function mount(
  api: NextSlotFinderApi,
  onPick = vi.fn(),
  extra: Partial<Parameters<typeof NextSlotFinder>[0]> = {},
) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MantineProvider env="test">
        <NextSlotFinder
          api={api}
          today="2026-10-02"
          siteId="site"
          doctors={[
            { id: "ana", name: "Dra. Ana", hasRota: true },
            { id: "luis", name: "Dr. Luis", hasRota: false },
          ]}
          onPick={onPick}
          {...extra}
        />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return onPick;
}

describe("NextSlotFinder", () => {
  it("shows the nearest slots for any doctor and time straight away", async () => {
    const nextSlots = vi.fn(async () => ({
      part: null,
      durationMin: 30,
      slots: [
        slot("2026-10-02T10:15:00+02:00", "luis", "Dr. Luis"),
        slot("2026-10-05T09:00:00+02:00"),
      ],
    }));
    mount({ nextSlots });
    expect(
      await screen.findByRole("button", { name: /Hoy · 10:15 · Dr\. Luis/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Lun 5 oct · 09:00 · Dra\. Ana/ }),
    ).toBeInTheDocument();
    expect(nextSlots).toHaveBeenCalledWith({ durationMin: 30, siteId: "site", limit: 6 });
  });

  it("filters by morning or afternoon and toggles the choice off again", async () => {
    const nextSlots = vi.fn(async () => ({ part: null, durationMin: 30, slots: [] }));
    mount({ nextSlots });
    const am = screen.getByRole("button", { name: /AM/ });
    const pm = screen.getByRole("button", { name: /PM/ });
    fireEvent.click(pm);
    expect(pm).toHaveAttribute("aria-pressed", "true");
    expect(am).toHaveAttribute("aria-pressed", "false");
    await waitFor(() =>
      expect(nextSlots).toHaveBeenLastCalledWith(expect.objectContaining({ part: "PM" })),
    );
    fireEvent.click(am);
    await waitFor(() =>
      expect(nextSlots).toHaveBeenLastCalledWith(expect.objectContaining({ part: "AM" })),
    );
    fireEvent.click(am);
    await waitFor(() =>
      expect(nextSlots).toHaveBeenLastCalledWith({ durationMin: 30, siteId: "site", limit: 6 }),
    );
  });

  it("narrows to one doctor and a longer visit", async () => {
    const nextSlots = vi.fn(async () => ({ part: null, durationMin: 30, slots: [] }));
    mount({ nextSlots });
    fireEvent.change(screen.getByLabelText("Doctor"), { target: { value: "ana" } });
    fireEvent.change(screen.getByLabelText("Duración"), { target: { value: "60" } });
    await waitFor(() =>
      expect(nextSlots).toHaveBeenLastCalledWith({
        durationMin: 60,
        staffId: "ana",
        siteId: "site",
        limit: 6,
      }),
    );
  });

  it("hands the chosen slot and length back to book it", async () => {
    const chosen = slot("2026-10-02T16:30:00+02:00");
    const onPick = mount({
      nextSlots: async () => ({ part: "PM", durationMin: 30, slots: [chosen] }),
    });
    fireEvent.click(await screen.findByRole("button", { name: /16:30/ }));
    expect(onPick).toHaveBeenCalledWith(chosen, 30);
  });

  it("starts from a given doctor, length and day when resolving a clash", async () => {
    const nextSlots = vi.fn(async () => ({ part: null, durationMin: 40, slots: [] }));
    mount({ nextSlots }, vi.fn(), {
      initialStaffId: "luis",
      initialDurationMin: 40,
      from: "2026-10-09",
    });
    await waitFor(() =>
      expect(nextSlots).toHaveBeenCalledWith({
        durationMin: 40,
        staffId: "luis",
        siteId: "site",
        from: "2026-10-09",
        limit: 6,
      }),
    );
    expect(screen.getByLabelText("Doctor")).toHaveValue("luis");
    expect(screen.getByLabelText("Duración")).toHaveValue("40");
  });

  it("explains empty results, failures and the default hours of doctors without a rota", async () => {
    mount({ nextSlots: async () => ({ part: "AM", durationMin: 30, slots: [] }) });
    expect(await screen.findByText(/No hay huecos libres/)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Luis no tiene horario/)).toBeInTheDocument();
    cleanup();
    mount({ nextSlots: async () => Promise.reject(new Error("offline")) });
    expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudieron buscar/);
  });
});
