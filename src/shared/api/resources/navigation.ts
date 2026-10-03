import type { ApiClient } from "../client";
import { navigationLayoutSchema, navigationLayoutsSchema } from "../schemas/navigation";
import type { NavigationKey } from "@/domain/navigation";

const toBody = (pinned: readonly NavigationKey[] | null) =>
  navigationLayoutSchema.parse({ pinned: pinned ? [...pinned] : null });

export function createNavigationResource(client: ApiClient) {
  return {
    layouts: () => client.request("/api/navigation/layout", navigationLayoutsSchema),
    /** `null` drops the personal order so the clinic default applies again. */
    saveMine: (pinned: readonly NavigationKey[] | null) =>
      client.mutation("/api/navigation/layout/me", navigationLayoutsSchema, toBody(pinned), {
        method: "PUT",
      }),
    saveClinic: (pinned: readonly NavigationKey[] | null) =>
      client.mutation("/api/navigation/layout/clinic", navigationLayoutsSchema, toBody(pinned), {
        method: "PUT",
      }),
  };
}
