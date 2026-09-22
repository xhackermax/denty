import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => {
  const locale = "es";
  const messages = (await import("../../messages/es.json")).default;

  return {
    locale,
    messages,
    timeZone: "Europe/Madrid",
  };
});
