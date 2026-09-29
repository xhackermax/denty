import { maybeHandlePaymentProviderRequest } from "../../../[...path]/payment-routes";
export async function POST(request: Request) {
  const r = await maybeHandlePaymentProviderRequest(request, "/payments/stripe/terminal");
  if (!r) throw new Error("Ruta Stripe no registrada");
  return r;
}
