// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CampaignsModule } from "../campaigns-module";

vi.mock("@/shared/api/browser", () => ({
  getBrowserApi: () => ({
    engagement: { marketing: { campaigns: async () => [] } },
  }),
}));
vi.mock("@/shared/tenancy/active-context", () => ({
  useActiveTenant: () => ({ permissions: [] }),
}));

afterEach(cleanup);

describe("CampaignsModule", () => {
  it("opens the ad platforms in a new tab from the campaigns module", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider env="test">
          <CampaignsModule />
        </MantineProvider>
      </QueryClientProvider>,
    );
    for (const [name, href] of [
      ["Google Ads", "https://ads.google.com"],
      ["Meta Ads", "https://business.facebook.com"],
    ] as const) {
      const link = screen.getByRole("link", { name: new RegExp(name) });
      expect(link).toHaveAttribute("href", href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("is what /app/campaigns renders: no standalone page shadows the module route", () => {
    expect(existsSync("src/app/(staff)/app/[module]/page.tsx")).toBe(true);
    expect(existsSync("src/app/(authenticated)/app/campaigns/page.tsx")).toBe(false);
  });
});
