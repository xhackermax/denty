export const APP_NAME = "Denty" as const;
export const APP_VERSION = "3.0.0" as const;

export function buildLabel(version: string): string {
  return `${APP_NAME} v${version}`;
}
