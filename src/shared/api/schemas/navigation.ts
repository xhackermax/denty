import { z } from "zod";

import { NAVIGATION_KEYS, navigationLayoutSchema } from "@/domain/navigation";

export { navigationLayoutSchema };

const storedLayoutSchema = z.object({ pinned: z.array(z.enum(NAVIGATION_KEYS)).min(1) }).nullable();

/** `available: false` means the database migration has not been applied yet. */
export const navigationLayoutsSchema = z.object({
  available: z.boolean(),
  clinic: storedLayoutSchema,
  user: storedLayoutSchema,
});
export type NavigationLayouts = z.infer<typeof navigationLayoutsSchema>;
