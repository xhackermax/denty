export interface SupabaseEnvironment {
  SUPABASE_URL?: string | undefined;
  NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
  SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
  SUPABASE_SECRET_KEY?: string | undefined;
  SUPABASE_PUBLISHABLE_KEY?: string | undefined;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string | undefined;
}

export interface SupabaseCredentials {
  url: string;
  key: string;
}

export function resolveSupabaseCredentials(
  env: SupabaseEnvironment,
): SupabaseCredentials | null {
  const url = firstCleanEnvValue(
    "SUPABASE_URL",
    env.SUPABASE_URL,
    env.SUPABASE_SECRET_KEY,
    env.SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_URL,
  );
  const key = firstCleanEnvValue(
    "SUPABASE_SERVICE_ROLE_KEY",
    env.SUPABASE_SERVICE_ROLE_KEY,
    readAssignment("SUPABASE_SECRET_KEY", env.SUPABASE_SECRET_KEY),
    readAssignment("SUPABASE_SECRET_KEY", env.SUPABASE_PUBLISHABLE_KEY),
    readAssignment("SUPABASE_PUBLISHABLE_KEY", env.SUPABASE_PUBLISHABLE_KEY),
    readAssignment("SUPABASE_PUBLISHABLE_KEY", env.SUPABASE_SECRET_KEY),
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return url && key ? { url, key } : null;
}

function readAssignment(name: string, value: string | undefined): string | undefined {
  if (!value?.includes("=")) return value;
  const line = value
    .split(/\r?\n/)
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim();
}

function firstCleanEnvValue(
  name: string,
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    const resolved = readAssignment(name, value)?.trim();
    if (!resolved || resolved.includes("\n") || resolved.includes("\r")) continue;
    if (resolved === "API Keys") continue;
    return resolved;
  }
  return undefined;
}
