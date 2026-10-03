import assert from "node:assert/strict";
import { fetchYouthCenterPolicies, isYouthCenterApiConfigured, youthCenterApiPublicConfig } from "../lib/youth-center-api";

assert.equal(isYouthCenterApiConfigured(), false);
assert.equal(isYouthCenterApiConfigured("  "), false);
assert.equal(isYouthCenterApiConfigured("test-key"), true);
assert.equal(youthCenterApiPublicConfig().credentialName, "YOUTHCENTER_OPEN_API_KEY");

let called = false;
const missing = await fetchYouthCenterPolicies({ fetcher: async () => { called = true; return new Response(); } });
assert.equal(missing.ok, false);
assert.equal(called, false, "인증키가 없으면 외부 호출하지 않는다");

let requested: URL | null = null;
const connected = await fetchYouthCenterPolicies({
  apiKey: "local-fixture-key",
  pageNum: 2,
  pageSize: 10,
  fetcher: async (input) => {
    requested = new URL(input.toString());
    return Response.json({ result: { youthPolicyList: [{ plcyNo: "fixture" }] } });
  },
});
assert.equal(connected.ok, true);
assert.equal(requested?.origin, "https://www.youthcenter.go.kr");
assert.equal(requested?.pathname, "/go/ythip/getPlcy");
assert.equal(requested?.searchParams.get("apiKeyNm"), "local-fixture-key");
assert.equal(requested?.searchParams.get("pageNum"), "2");
assert.equal(requested?.searchParams.get("pageSize"), "10");
assert.equal(requested?.searchParams.get("rtnType"), "json");

const rejected = await fetchYouthCenterPolicies({
  apiKey: "invalid-fixture-key",
  fetcher: async () => Response.json({ errorCode: "e001", errorMsg: "invalid api key." }, { status: 403 }),
});
assert.deepEqual(rejected, { ok: false, state: "provider_error", status: 403, code: "e001", message: "invalid api key." });

const invalid = await fetchYouthCenterPolicies({ apiKey: "fixture", fetcher: async () => new Response("<html />", { status: 200 }) });
assert.equal(invalid.ok, false);
assert.equal(invalid.state, "invalid_response");

const offline = await fetchYouthCenterPolicies({ apiKey: "fixture", fetcher: async () => { throw new Error("offline"); } });
assert.equal(offline.ok, false);
assert.equal(offline.state, "network_error");
console.log("Youth Center API adapter: missing key, request contract, provider error, invalid JSON and network failure passed.");
