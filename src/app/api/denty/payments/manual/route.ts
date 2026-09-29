import { maybeHandlePaymentProviderRequest } from "../../[...path]/payment-routes";
export async function POST(request: Request) {
  const r = await maybeHandlePaymentProviderRequest(request, "/payments/manual");
  if (!r) throw new Error("Ruta manual no registrada");
  return r;
}
