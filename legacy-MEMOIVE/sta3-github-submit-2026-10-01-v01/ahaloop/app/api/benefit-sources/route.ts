import { benefitSources, sourceStatusLabel } from "@/lib/benefit-source-registry";
import { benefits } from "@/lib/benefit-catalog";
import { assess } from "@/lib/benefit-rules";
import { getD1Binding } from "@/db";
import { readProfile } from "@/lib/profile-model";
import { requestUser, apiError } from "@/lib/request-user";
import { env } from "cloudflare:workers";
import { isYouthCenterApiConfigured } from "@/lib/youth-center-api";

export const dynamic = "force-dynamic";

export async function GET() {
 try {
  const user = await requestUser();
  const row = await getD1Binding().prepare("SELECT profile_data FROM user_profiles WHERE user_id=?").bind(user).first<Record<string,unknown>>();
  const now = Date.now();
  const youthCenterConfigured=isYouthCenterApiConfigured((env as unknown as {YOUTHCENTER_OPEN_API_KEY?:string}).YOUTHCENTER_OPEN_API_KEY);
  const sources = benefitSources.map((source) => {
    const connection=source.id==="youth-center-api" && youthCenterConfigured ? "api_configured" as const : source.connection;
    const ageMinutes = Math.max(0, Math.round((now - new Date(source.lastVerifiedAt).getTime()) / 60000));
    return { ...source, connection, statusLabel: sourceStatusLabel[connection], ageMinutes, freshness: ageMinutes <= source.freshnessSlaMinutes ? "within_sla" : "overdue" };
  });
  return Response.json({
    sources,
    summary: { total: sources.length, apiCandidates: sources.filter((source) => source.method === "open_api").length, keysRequired: sources.filter((source) => source.connection === "key_required").length, automatedNow: 0, urgentBenefits: benefits.map(b => assess(b,readProfile(row))).filter(b=>b.urgency==="urgent" && b.eligibilityStatus!=="ineligible").length, catalogCount: benefits.length, registeredDomains: new Set(benefits.map(b=>new URL(b.sourceUrl).hostname)).size },
    speedPolicy: { discoverSlaMinutes: 60, verifySlaMinutes: 180, notifySlaMinutes: 30, rule: "마감 7일 이내 또는 조건·금액 변경은 P0로 승격하고 운영 검수 후 30분 안에 대상자에게 알림" },
  });
 } catch (error) { return apiError(error); }
}
