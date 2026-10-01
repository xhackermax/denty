// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ClinicalDragContext } from "../clinical-drag-context";
import { AgendaDropColumn } from "@/features/agenda/agenda-drop-column";
afterEach(cleanup);
test("droppable columns preserve slot clicks and native drop callbacks", () => {
  const click = vi.fn(),
    drop = vi.fn();
  render(
    <ClinicalDragContext onDragEnd={() => undefined}>
      <AgendaDropColumn
        id="staff-day"
        role="region"
        aria-label="Columna del día"
        onClick={click}
        onDrop={drop}
      >
        09:00
      </AgendaDropColumn>
    </ClinicalDragContext>,
  );
  const column = screen.getByRole("region", { name: "Columna del día" });
  expect(column).not.toHaveAttribute("data-drop-active");
  fireEvent.click(column);
  fireEvent.drop(column);
  expect(click).toHaveBeenCalledTimes(1);
  expect(drop).toHaveBeenCalledTimes(1);
});
