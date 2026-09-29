import { describe, expect, it } from "vitest";

import { providerSetup, stripeAddressFromSite } from "./terminal-providers";

describe("datáfonos conectados", () => {
  it("dice qué claves faltan por proveedor, sin exponer valores", () => {
    expect(providerSetup({})).toEqual([
      { provider: "sumup", configured: false, missing: ["SUMUP_API_KEY", "SUMUP_MERCHANT_CODE"] },
      { provider: "stripe", configured: false, missing: ["STRIPE_SECRET_KEY"] },
    ]);
    expect(
      providerSetup({ SUMUP_API_KEY: "k", SUMUP_MERCHANT_CODE: "M1", STRIPE_SECRET_KEY: " " }),
    ).toEqual([
      { provider: "sumup", configured: true, missing: [] },
      { provider: "stripe", configured: false, missing: ["STRIPE_SECRET_KEY"] },
    ]);
  });

  it("convierte la dirección de la sede en la dirección de la ubicación de Stripe", () => {
    expect(
      stripeAddressFromSite({
        name: "Av. Navarra",
        address: "Avenida de Navarra 17, local bajo, 50010",
        city: "Zaragoza",
      }),
    ).toEqual({
      line1: "Avenida de Navarra 17, local bajo",
      city: "Zaragoza",
      postal_code: "50010",
      country: "ES",
    });
    expect(
      stripeAddressFromSite({
        name: "Cariñena",
        address: "Calle Mayor 116, 3.º",
        city: "Cariñena",
      }),
    ).toEqual({ line1: "Calle Mayor 116, 3.º", city: "Cariñena", country: "ES" });
  });

  it("pide completar la sede si no tiene dirección", () => {
    expect(() => stripeAddressFromSite({ name: "Nueva", address: null, city: "Zaragoza" })).toThrow(
      /Completa la dirección/,
    );
  });
});
