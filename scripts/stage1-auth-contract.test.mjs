import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const authRepo = read('src/server/auth/auth-repository.ts');
const route = read('src/server/denty-supabase/route-handler.ts');
const login = read('src/features/auth/login-form.tsx');
const permissions = read('src/domain/permissions.ts');
const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter((x) => x.endsWith('.sql')).sort().map((x) => read(`supabase/migrations/${x}`)).join('\n');

assert(exists('src/server/supabase/auth-client.ts'), 'missing Supabase Auth client');
assert(exists('src/server/auth/auth-session.ts'), 'missing Supabase Auth cookie/session adapter');
assert(!authRepo.includes('password_hash'), 'auth repository still reads password hashes');
assert(!authRepo.includes('findPatientForPortalLogin'), 'patient DNI/record-number login remains');
assert(!route.includes('createSessionCookie('), 'legacy signed actor cookie remains in route handler');
const retiredBootstrapCredential = ['admin', 'admin'].join('/');
assert(!login.includes(retiredBootstrapCredential), 'retired bootstrap credential remains in login UI');
assert(!read('src/app/(public)/login/page.tsx').includes(retiredBootstrapCredential), 'retired bootstrap credential remains in public login copy');
assert(!read('src/shared/config/env.ts').includes('DENTY_DEFAULT_CLINIC_ID'), 'default clinic fallback remains configurable');
assert(!read('src/shared/config/env.ts').includes('DENTY_SESSION_SECRET'), 'legacy signed-session secret remains configured');
assert(!login.includes('Contraseña o DNI'), 'DNI is still advertised as a password');
assert(route.includes('PIN_LOGIN_RETIRED'), 'legacy PIN login can still fall through to a second auth backend');
assert(!read('src/shared/api/schemas/admin.ts').includes('username:'), 'legacy username field remains in user creation schema');
assert(!read('src/shared/api/schemas/admin.ts').includes('pin:'), 'legacy PIN field remains in user creation schema');
assert(permissions.includes('"ADMIN", "RECEPTION", "DENTIST", "ASSISTANT", "PATIENT"'), 'domain role vocabulary changed unexpectedly');
assert(/role\s+text\s+not\s+null\s+check\s*\(role\s+in\s*\([^)]*RECEPTION[^)]*DENTIST[^)]*ASSISTANT[^)]*PATIENT/i.test(migrations), 'DB membership roles do not match domain roles');
assert(/create table if not exists public\.app_sessions/i.test(migrations), 'real app session registry missing');
assert(/revoke all on table public\.app_sessions from authenticated/i.test(migrations), 'authenticated retains broad app_sessions privileges');
assert(/revoke insert, update, delete on public\.staff_members from authenticated/i.test(migrations), 'staff identity table remains writable from ordinary sessions');
assert(/drop table if exists public\.denty_users/i.test(migrations), 'legacy denty_users is not retired');
assert(/create unique index[^;]*staff_members[^;]*profile_id/is.test(migrations), 'staff/profile uniqueness not enforced');
assert(read('src/server/supabase/auth-client.ts').includes('auth.signInWithPassword'), 'login does not use the official Supabase Auth client');
assert(read('src/server/supabase/auth-client.ts').includes('auth.admin.createUser'), 'admin provisioning does not use the official Supabase Auth Admin API');
assert(read('scripts/auth/provision-first-owner.mjs').includes('.from("audit_log")'), 'first-owner provisioning is not audited');
assert(read('scripts/auth/provision-first-owner.mjs').includes('SUPABASE_SECRET_KEY'), 'owner provisioning does not accept the current Supabase secret-key model');
assert(read('src/server/supabase/auth-client.ts').includes('auth.admin.signOut(accessToken, "local")'), 'logout can revoke unrelated Supabase Auth sessions');
assert(!route.includes('expiresAt: session.expiresAt'), 'app session incorrectly expires with the short-lived access token');
assert(authRepo.includes('expires_at: new Date(Date.now() + APP_SESSION_TTL_MS)'), 'app session TTL is not renewed on activity');

console.log('stage1 auth contract: OK');
