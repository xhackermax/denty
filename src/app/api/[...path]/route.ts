import { handleDentyApiRequest, type DentyRouteContext } from "@/server/denty-api/request-handler";

async function restfulRequest(request: Request, context: DentyRouteContext): Promise<Response> {
  const { path } = await context.params;
  return handleDentyApiRequest(request, `/api/${path.join("/")}`);
}

export const GET = restfulRequest;
export const POST = restfulRequest;
export const PUT = restfulRequest;
export const PATCH = restfulRequest;
export const DELETE = restfulRequest;
