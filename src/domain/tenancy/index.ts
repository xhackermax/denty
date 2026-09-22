export const TENANT_MEMBERSHIP_ROLES = [
  "OWNER",
  "ORG_ADMIN",
  "CLINIC_MANAGER",
  "CLINIC_STAFF",
  "PATIENT",
] as const;

export type TenantMembershipRole = (typeof TENANT_MEMBERSHIP_ROLES)[number];

export const SUBSCRIPTION_PLANS = [
  "BASIC",
  "PROFESSIONAL",
  "MULTICLINIC",
] as const;

export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const TENANT_FEATURES = [
  "multiClinic",
  "voiceAssistant",
  "patientPortal",
  "games",
  "advancedAnalytics",
  "marketing",
  "realtime",
] as const;

export type TenantFeature = (typeof TENANT_FEATURES)[number];

export interface TenantScope {
  organizationId: string;
  clinicId?: string;
}

export interface OrganizationMembership {
  organizationId: string;
  userId: string;
  role: TenantMembershipRole;
  clinicIds: readonly string[];
}

export interface OrganizationEntitlements {
  plan: SubscriptionPlan;
  features: Readonly<Partial<Record<TenantFeature, boolean>>>;
}

export function tenantScopeKey(scope: TenantScope): string {
  return scope.clinicId
    ? `${scope.organizationId}:${scope.clinicId}`
    : scope.organizationId;
}

export function belongsToTenant(
  resource: { organizationId: string; clinicId?: string },
  scope: TenantScope,
): boolean {
  if (resource.organizationId !== scope.organizationId) return false;
  if (!scope.clinicId) return true;
  return resource.clinicId === scope.clinicId;
}

export function featureEnabled(
  entitlements: OrganizationEntitlements,
  feature: TenantFeature,
): boolean {
  return entitlements.features[feature] === true;
}
