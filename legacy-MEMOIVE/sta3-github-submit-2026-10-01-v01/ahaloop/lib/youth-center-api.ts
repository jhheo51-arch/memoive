const YOUTH_CENTER_POLICY_ENDPOINT = "https://www.youthcenter.go.kr/go/ythip/getPlcy";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type YouthCenterApiResult =
  | { ok: true; state: "connected"; receivedAt: string; payload: unknown }
  | { ok: false; state: "not_configured" | "provider_error" | "invalid_response" | "network_error"; status?: number; code?: string; message: string };

export function isYouthCenterApiConfigured(apiKey?: string) {
  return Boolean(apiKey?.trim());
}

export function youthCenterApiPublicConfig() {
  return {
    endpoint: YOUTH_CENTER_POLICY_ENDPOINT,
    credentialName: "YOUTHCENTER_OPEN_API_KEY",
    responseType: "json",
  } as const;
}

export async function fetchYouthCenterPolicies({
  apiKey,
  pageNum = 1,
  pageSize = 1,
  fetcher = fetch,
}: {
  apiKey?: string;
  pageNum?: number;
  pageSize?: number;
  fetcher?: FetchLike;
}): Promise<YouthCenterApiResult> {
  const key = apiKey?.trim();
  if (!key) return { ok: false, state: "not_configured", message: "온통청년 인증키가 연결되지 않았습니다." };

  const url = new URL(YOUTH_CENTER_POLICY_ENDPOINT);
  url.searchParams.set("apiKeyNm", key);
  url.searchParams.set("pageNum", String(Math.max(1, Math.trunc(pageNum))));
  url.searchParams.set("pageSize", String(Math.max(1, Math.min(100, Math.trunc(pageSize)))));
  url.searchParams.set("rtnType", "json");

  try {
    const response = await fetcher(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    const text = await response.text();
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return { ok: false, state: "invalid_response", status: response.status, message: "온통청년이 JSON이 아닌 응답을 반환했습니다." };
    }

    if (!response.ok) {
      const error = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      return {
        ok: false,
        state: "provider_error",
        status: response.status,
        code: typeof error.errorCode === "string" ? error.errorCode : undefined,
        message: typeof error.errorMsg === "string" ? error.errorMsg : "온통청년 API 호출에 실패했습니다.",
      };
    }

    return { ok: true, state: "connected", receivedAt: new Date().toISOString(), payload };
  } catch {
    return { ok: false, state: "network_error", message: "온통청년 API에 연결하지 못했습니다." };
  }
}
