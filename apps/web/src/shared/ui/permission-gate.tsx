import type { ReactNode } from "react";

interface PermissionGateProps {
  permissions: readonly string[];
  require: string | readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate(props: PermissionGateProps) {
  const { permissions, require, children, fallback = null } = props;
  const required = typeof require === "string" ? [require] : require;
  const allowed = required.every((permission) => permissions.includes(permission));

  return <>{allowed ? children : fallback}</>;
}
