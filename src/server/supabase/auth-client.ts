import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { withoutUndefined } from "@/shared/lib/without-undefined";

export interface SupabaseAuthCredentials {
  url: string;
  publishableKey: string;
  serviceRoleKey?: string | undefined;
}

export interface SupabaseAuthUser {
  id: string;
  email?: string | null | undefined;
  phone?: string | null | undefined;
  user_metadata?: Record<string, unknown> | undefined;
  app_metadata?: Record<string, unknown> | undefined;
}

export interface SupabaseAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  tokenType: string;
  user: SupabaseAuthUser;
}

export class SupabaseAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: unknown,
  ) {
    super(message);
  }
}

export class SupabaseAuthClient {
  private readonly publicClient: SupabaseClient;
  private readonly adminClient: SupabaseClient | null;

  constructor(
    private readonly credentials: SupabaseAuthCredentials,
    fetchImpl: typeof fetch = fetch,
  ) {
    const common = {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: fetchImpl },
    } as const;
    this.publicClient = createClient(credentials.url, credentials.publishableKey, common);
    this.adminClient = credentials.serviceRoleKey?.trim()
      ? createClient(credentials.url, credentials.serviceRoleKey.trim(), common)
      : null;
  }

  async signInWithPassword(identifier: string, password: string): Promise<SupabaseAuthSession> {
    const normalized = identifier.trim();
    const credentials = looksLikePhone(normalized)
      ? { phone: normalized, password }
      : { email: normalized.toLowerCase(), password };
    const { data, error } = await this.publicClient.auth.signInWithPassword(credentials);
    if (error || !data.session || !data.user) throw authError(error, "No se pudo iniciar sesión.");
    return normalizeSession(data.session, data.user);
  }

  async refreshSession(refreshToken: string): Promise<SupabaseAuthSession> {
    const { data, error } = await this.publicClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error || !data.session || !data.user)
      throw authError(error, "No se pudo renovar la sesión.");
    return normalizeSession(data.session, data.user);
  }

  async getUser(accessToken: string): Promise<SupabaseAuthUser> {
    const { data, error } = await this.publicClient.auth.getUser(accessToken);
    if (error || !data.user) throw authError(error, "No se pudo validar el usuario.");
    return normalizeUser(data.user);
  }

  async signOut(accessToken: string): Promise<void> {
    // Application sessions/cookies are the source of device-scoped logout in Denty.
    // When an admin client exists, revoke only this refresh/access session at Supabase too.
    if (!this.adminClient) return;
    const { error } = await this.adminClient.auth.admin.signOut(accessToken, "local");
    if (error) throw authError(error, "No se pudo cerrar la sesión de Supabase.");
  }

  async requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
    const { error } = await this.publicClient.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      redirectTo ? { redirectTo } : undefined,
    );
    if (error) throw authError(error, "No se pudo solicitar el restablecimiento de contraseña.");
  }

  async updatePassword(accessToken: string, password: string): Promise<void> {
    const scoped = createClient(this.credentials.url, this.credentials.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { error } = await scoped.auth.updateUser({ password });
    if (error) throw authError(error, "No se pudo actualizar la contraseña.");
  }

  async adminCreateUser(input: {
    email: string;
    password: string;
    displayName: string;
    emailConfirm?: boolean | undefined;
  }): Promise<SupabaseAuthUser> {
    const admin = this.requireAdmin();
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email.trim().toLowerCase(),
      password: input.password,
      email_confirm: input.emailConfirm ?? true,
      user_metadata: { display_name: input.displayName },
    });
    if (error || !data.user) throw authError(error, "No se pudo crear el usuario.");
    return normalizeUser(data.user);
  }

  async adminUpdateUser(
    userId: string,
    attributes: {
      email?: string | undefined;
      password?: string | undefined;
      user_metadata?: Record<string, unknown> | undefined;
    },
  ): Promise<SupabaseAuthUser> {
    const { data, error } = await this.requireAdmin().auth.admin.updateUserById(
      userId,
      withoutUndefined(attributes),
    );
    if (error || !data.user) throw authError(error, "No se pudo actualizar el usuario.");
    return normalizeUser(data.user);
  }

  async adminDeleteUser(userId: string): Promise<void> {
    const { error } = await this.requireAdmin().auth.admin.deleteUser(userId);
    if (error) throw authError(error, "No se pudo eliminar el usuario.");
  }

  private requireAdmin(): SupabaseClient {
    if (!this.adminClient)
      throw new SupabaseAuthError(
        "La operación administrativa requiere SUPABASE_SECRET_KEY o service-role.",
        503,
        null,
      );
    return this.adminClient;
  }
}

function normalizeSession(
  session: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at?: number;
    token_type: string;
  },
  user: User,
): SupabaseAuthSession {
  const expiresIn = Number(session.expires_in || 3600);
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn,
    expiresAt: Number(session.expires_at || Math.floor(Date.now() / 1000) + expiresIn),
    tokenType: session.token_type || "bearer",
    user: normalizeUser(user),
  };
}

function normalizeUser(user: User): SupabaseAuthUser {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
  };
}

function authError(
  error: { message?: string | undefined; status?: number | undefined } | null,
  fallback: string,
): SupabaseAuthError {
  return new SupabaseAuthError(error?.message || fallback, Number(error?.status || 500), error);
}

function looksLikePhone(value: string): boolean {
  return /^\+?[0-9][0-9\s()-]{6,}$/.test(value) && !value.includes("@");
}
