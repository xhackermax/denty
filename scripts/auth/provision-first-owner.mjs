import { createClient } from "@supabase/supabase-js";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} es obligatorio.`);
  return value;
};

const url = required("SUPABASE_URL");
const serviceKey =
  process.env.SUPABASE_SECRET_KEY?.trim() || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!serviceKey) throw new Error("SUPABASE_SECRET_KEY o SUPABASE_SERVICE_ROLE_KEY es obligatorio.");
const email = required("DENTY_OWNER_EMAIL").toLowerCase();
const password = required("DENTY_OWNER_PASSWORD");
const displayName = required("DENTY_OWNER_NAME");
const clinicName = required("DENTY_CLINIC_NAME");
if (password === "admin" || password.length < 12)
  throw new Error("DENTY_OWNER_PASSWORD debe tener al menos 12 caracteres y no puede ser 'admin'.");

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: created, error: createUserError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: displayName },
});
if (createUserError || !created.user)
  throw createUserError ?? new Error("Supabase no devolvió el usuario creado.");
const user = created.user;

let clinicId = process.env.DENTY_CLINIC_ID?.trim();
let createdClinic = false;
try {
  if (!clinicId) {
    const { data: clinic, error } = await supabase
      .from("clinics")
      .insert({ name: clinicName })
      .select("id")
      .single();
    if (error) throw error;
    clinicId = clinic?.id;
    createdClinic = true;
  }
  if (!clinicId) throw new Error("No se pudo resolver clinicId.");

  const names = displayName.trim().split(/\s+/);
  const firstName = names.shift() || displayName;
  const lastName = names.join(" ");
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, email, active: true })
    .eq("id", user.id);
  if (profileError) throw profileError;
  const { error: memberError } = await supabase.from("clinic_members").insert({
    clinic_id: clinicId,
    profile_id: user.id,
    role: "ADMIN",
    active: true,
    is_default: true,
  });
  if (memberError) throw memberError;
  const { error: staffError } = await supabase.from("staff_members").insert({
    clinic_id: clinicId,
    profile_id: user.id,
    display_name: displayName,
    role: "ADMIN",
    active: true,
  });
  if (staffError) throw staffError;
  const { error: auditError } = await supabase.from("audit_log").insert({
    clinic_id: clinicId,
    actor_profile_id: user.id,
    action: "identity.owner.provisioned",
    entity_type: "profile",
    entity_id: user.id,
    metadata: { source: "auth:provision-owner", role: "ADMIN" },
  });
  if (auditError) throw auditError;
  console.log(JSON.stringify({ ok: true, userId: user.id, clinicId }, null, 2));
} catch (error) {
  if (clinicId)
    await supabase
      .from("staff_members")
      .delete()
      .eq("clinic_id", clinicId)
      .eq("profile_id", user.id)
      .catch(() => undefined);
  await supabase.auth.admin.deleteUser(user.id).catch(() => undefined);
  if (createdClinic && clinicId)
    await supabase
      .from("clinics")
      .delete()
      .eq("id", clinicId)
      .catch(() => undefined);
  throw error;
}
