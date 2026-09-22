import legacyRoutes from "../../../docs/legacy-api-routes.json" with { type: "json" };

interface LegacyRouteRecord {
  method: string;
  path: string;
  kind: "browser" | "server_only" | "sse" | "legacy_bug";
  correctedPath?: string;
}

function normalizePath(value: string): string {
  const withSlash = value.startsWith("/") ? value : `/${value}`;
  return withSlash.length > 1 ? withSlash.replace(/\/$/, "") : withSlash;
}

function routePattern(pathname: string): RegExp {
  const escaped = normalizePath(pathname)
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) return "[^/]+";
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  return new RegExp(`^${escaped}$`);
}

const allowedRoutes = (legacyRoutes.routes as LegacyRouteRecord[])
  .filter((route) => route.kind !== "server_only")
  .map((route) => ({
    method: route.method,
    pattern: routePattern(
      route.kind === "legacy_bug" && route.correctedPath
        ? route.correctedPath
        : route.path,
    ),
  }));

export function isAllowedDentyProxyRoute(method: string, pathname: string): boolean {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizePath(pathname);
  return allowedRoutes.some(
    (route) =>
      route.method === normalizedMethod && route.pattern.test(normalizedPath),
  );
}
