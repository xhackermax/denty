// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MotionNumber } from "./motion-number";

describe("MotionNumber", () => {
  it("exposes the final semantic value while using a compact reveal", () => {
    render(<MotionNumber value={1234} format="currency" ariaLabel="Producido" />);
    expect(screen.getByLabelText(/Producido:.*1(?:[.\s]?234)/)).toBeInTheDocument();
  });
});
