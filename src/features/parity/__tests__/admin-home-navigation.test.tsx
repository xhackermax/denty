// @vitest-environment jsdom
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SYSTEM_NAV } from "@/features/navigation/catalog";
import { AdminPage } from "../admin-page";

describe("AdminPage navigation", () => {
  it("removes duplicate security settings without removing administration tools", () => {
    render(
      <MantineProvider env="test">
        <AdminPage />
      </MantineProvider>,
    );

    expect(screen.queryByRole("link", { name: /Seguridad y ajustes/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Usuarios y roles/i })).toHaveAttribute(
      "href",
      "/app/admin/users",
    );
    expect(screen.getByRole("link", { name: /Exportar datos/i })).toHaveAttribute(
      "href",
      "/app/admin/export",
    );
  });

  it("preserves the settings route in the system section of More", () => {
    expect(SYSTEM_NAV).toContainEqual(
      expect.objectContaining({ href: "/app/settings", key: "settings" }),
    );
  });
});
