import { handleDentyApiRequest, type DentyRouteContext } from "@/server/denty-api/request-handler";
import { maybeHandlePaymentProviderRequest } from "./payment-routes";
async function proxyRequest(request: Request, context: DentyRouteContext): Promise<Response> {
  const { path } = await context.params;
  const routePath = `/${path.join("/")}`;
  const p = await maybeHandlePaymentProviderRequest(request, routePath);
  return p ?? handleDentyApiRequest(request, routePath);
}
export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
