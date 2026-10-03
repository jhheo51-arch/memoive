import { env } from "cloudflare:workers";
import { requireOperator, apiError } from "@/lib/request-user";
import { fetchYouthCenterPolicies, isYouthCenterApiConfigured, youthCenterApiPublicConfig } from "@/lib/youth-center-api";

export const dynamic = "force-dynamic";
type YouthCenterEnv = { YOUTHCENTER_OPEN_API_KEY?: string };

function apiKey() {
  return (env as unknown as YouthCenterEnv).YOUTHCENTER_OPEN_API_KEY;
}

export async function GET() {
  try {
    await requireOperator();
    return Response.json({ configured: isYouthCenterApiConfigured(apiKey()), ...youthCenterApiPublicConfig() });
  } catch (error) { return apiError(error); }
}

export async function POST() {
  try {
    await requireOperator();
    const result = await fetchYouthCenterPolicies({ apiKey: apiKey(), pageSize: 1 });
    if (!result.ok) {
      const status = result.state === "not_configured" ? 409 : result.state === "provider_error" ? 502 : 503;
      return Response.json(result, { status });
    }
    return Response.json(result);
  } catch (error) { return apiError(error); }
}
