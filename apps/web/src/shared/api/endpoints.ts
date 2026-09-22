import type { ApiClient } from "./client";
import { createAdminResource } from "./resources/admin";
import { createAgendaResource } from "./resources/agenda";
import { createAnalyticsResource } from "./resources/analytics";
import { createBillingResource } from "./resources/billing";
import { createClinicalResource } from "./resources/clinical";
import { createCoreResource } from "./resources/core";
import { createEngagementResource } from "./resources/engagement";
import { createPortalResource } from "./resources/portal";
import { createPrescriptionsResource } from "./resources/prescriptions";
import { createSecurityResource } from "./resources/security";
import { createVoiceResource } from "./resources/voice";

export function createDentyApi(client: ApiClient) {
  return {
    ...createCoreResource(client),
    admin: createAdminResource(client),
    agenda: createAgendaResource(client),
    analytics: createAnalyticsResource(client),
    billing: createBillingResource(client),
    clinical: createClinicalResource(client),
    engagement: createEngagementResource(client),
    portal: createPortalResource(client),
    prescriptions: createPrescriptionsResource(client),
    security: createSecurityResource(client),
    voice: createVoiceResource(client),
  } as const;
}

export type DentyApi = ReturnType<typeof createDentyApi>;
