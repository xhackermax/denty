// @vitest-environment jsdom

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AnimatedProgress } from "./animated-progress";

describe("AnimatedProgress", () => {
  it("keeps the target percentage accessible throughout the reveal", () => {
    render(<MantineProvider><AnimatedProgress value={72} aria-label="Conversión" /></MantineProvider>);
    expect(screen.getByLabelText("Conversión: 72%")).toBeInTheDocument();
  });
});
