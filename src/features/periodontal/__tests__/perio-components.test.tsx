// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { deriveMouthState } from "@/domain/odontogram/mouth-state";
import { createPerioExam } from "@/domain/periodontal/exam";
import { comparePerio } from "../perio-compare";
import { PerioToothGraph } from "../perio-tooth-graph";
afterEach(cleanup);
test("compares only measured sites, skips absent and reports accessible graph", () => {
  const old = createPerioExam(deriveMouthState([]), [
    { tooth: "36", site: "MV", probingDepth: 6, recession: 2 },
    { tooth: "36", site: "V", probingDepth: 2, recession: 0 },
  ]);
  const next = createPerioExam(deriveMouthState([]), [
    { tooth: "36", site: "MV", probingDepth: 3, recession: 1 },
    { tooth: "36", site: "V", probingDepth: 3, recession: 0 },
  ]);
  expect(comparePerio(next, old)).toEqual({ improved: 1, worsened: 1, unchanged: 0 });
  render(<PerioToothGraph tooth="36" data={next.teeth["36"]!} />);
  expect(screen.getByRole("img")).toHaveAccessibleName("Margen rojo e inserción azul del 36");
});
