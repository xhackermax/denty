import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TasksPage } from "../../tasks-page";

// Next prerenders /app/tasks on the server, where there is no window.
describe("tasks page on the server", () => {
  it("renders without touching the browser-only API client", () => {
    expect(typeof window).toBe("undefined");

    const html = renderToString(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider>
          <TasksPage />
        </MantineProvider>
      </QueryClientProvider>,
    );

    expect(html).toContain("Tareas");
  });
});
