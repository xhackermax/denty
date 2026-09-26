export type RouteTransitionKind = "glide" | "lift" | "settle";
export type RouteTransitionDirection = -1 | 1;

export interface RouteTransitionSpec {
  kind: RouteTransitionKind;
  direction: RouteTransitionDirection;
}

const MODULE_ORDER = [
  "/app",
  "/app/patients",
  "/app/agenda",
  "/app/documents",
  "/app/finance",
  "/app/laboratory",
  "/app/prescriptions",
  "/app/communications",
  "/app/tasks",
  "/app/analysis",
  "/app/campaigns",
  "/app/alerts",
  "/app/attendance",
  "/app/settings",
  "/app/admin",
] as const;

function cleanPath(value: string): string {
  return value.split(/[?#]/, 1)[0]?.replace(/\/$/, "") || "/app";
}

function moduleRoot(pathname: string): string {
  const clean = cleanPath(pathname);
  if (clean === "/app") return clean;
  return MODULE_ORDER.find((route) => route !== "/app" && clean.startsWith(route)) ?? clean;
}

function pathDepth(pathname: string): number {
  return cleanPath(pathname).split("/").filter(Boolean).length;
}

export function resolveRouteTransition(from: string, to: string): RouteTransitionSpec {
  const fromRoot = moduleRoot(from);
  const toRoot = moduleRoot(to);

  if (fromRoot === toRoot) {
    const depthDelta = pathDepth(to) - pathDepth(from);
    return { kind: depthDelta <= 0 ? "settle" : "lift", direction: depthDelta < 0 ? -1 : 1 };
  }

  const fromIndex = MODULE_ORDER.indexOf(fromRoot as (typeof MODULE_ORDER)[number]);
  const toIndex = MODULE_ORDER.indexOf(toRoot as (typeof MODULE_ORDER)[number]);
  if (fromIndex >= 0 && toIndex >= 0) {
    return { kind: "glide", direction: toIndex >= fromIndex ? 1 : -1 };
  }

  return { kind: "settle", direction: 1 };
}
