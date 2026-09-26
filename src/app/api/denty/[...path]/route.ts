import { handleDentyApiRequest, type DentyRouteContext } from "@/server/denty-api/request-handler";

async function proxyRequest(request: Request, context: DentyRouteContext): Promise<Response> {
  const { path } = await context.params;
  return handleDentyApiRequest(request, `/${path.join("/")}`);
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
