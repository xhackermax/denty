import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import type { ReactNode } from "react";

import { TasksTimeline } from "../tasks-timeline";
import type { TaskUpdateInput, TasksApi, TimelineTask } from "../task-types";

export const NOW = new Date("2026-09-30T08:00:00+02:00");

export function mk(over: Partial<TimelineTask> & { id: string }): TimelineTask {
  return {
    title: over.id.toUpperCase(),
    status: "OPEN",
    priority: "NORMAL",
    version: 1,
    position: 0,
    durationMin: 15,
    dueAt: null,
    archivedAt: null,
    scheduledOn: over.dueAt ? null : "2026-09-30",
    ...over,
  };
}

export function makeApi(initial: TimelineTask[]) {
  let items = initial.map((t) => ({ ...t }));
  const api = {
    list: vi.fn(async () => ({ items: items.map((t) => ({ ...t })) })),
    create: vi.fn(async () => ({})),
    update: vi.fn(async (id: string, input: TaskUpdateInput) => {
      items = items.map((t) =>
        t.id === id
          ? {
              ...t,
              ...(input.status ? { status: input.status } : {}),
              ...(input.archived !== undefined
                ? { archivedAt: input.archived ? "2026-09-30T00:00:00Z" : null }
                : {}),
              ...(input.scheduledOn !== undefined ? { scheduledOn: input.scheduledOn } : {}),
              ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
              version: t.version + 1,
            }
          : t,
      );
      return {};
    }),
    reorder: vi.fn(async (ids: string[]) => {
      items = ids.map((id, i) => ({
        ...(items.find((t) => t.id === id) as TimelineTask),
        position: i,
      }));
      return {};
    }),
  };
  return api satisfies TasksApi;
}

export function Providers({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
}

export function renderTimeline(api: TasksApi) {
  return render(
    <Providers>
      <TasksTimeline api={api} now={() => NOW} />
    </Providers>,
  );
}

export function titlesInOrder(testId = "task-title") {
  return Array.from(document.querySelectorAll(`[data-testid="${testId}"]`)).map(
    (el) => el.textContent,
  );
}
