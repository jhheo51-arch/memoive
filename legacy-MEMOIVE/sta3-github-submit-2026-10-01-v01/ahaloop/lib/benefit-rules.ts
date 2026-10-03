import type { Benefit } from "./benefit-catalog";
import type { ProfileData } from "./profile-model";
export const RULE_VERSION = "2026-09-18-v3";
export function deadlineState(benefit: Benefit, now = new Date()) {
  if (!benefit.deadlineDate) return { date: null, days: null, closed: benefit.id === "seoul-youth-rent-2026", urgent: false };
  const today = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  const days = Math.round((Date.parse(benefit.deadlineDate) - Date.parse(today)) / 86400000);
  return { date: benefit.deadlineDate, days, closed: days < 0, urgent: days >= 0 && days <= 7 };
}
export function assess(benefit: Benefit, profile: ProfileData, now = new Date()) {
  const known = new Set(profile.confirmedFields);
  const matched: string[] = []; const failed: string[] = []; const unknown = [...benefit.missing];
  const age = known.has("age") ? profile.age : null;
  const checkAge = (min:number,max=110) => {if(age === null) unknown.push("정확한 만 나이"); else if(age<min||age>max) failed.push(`만 ${min}~${max}세 조건 불일치`);else matched.push(`만 ${age}세`);};
  let amount=0;
  if(benefit.id.startsWith("kpass")) {
    checkAge(19,34); unknown.length=0;
    if(age===null)unknown.push("정확한 만 나이");
    if(!known.has("kpassRegistered")||!profile.kpassRegistered)unknown.push("K-패스 카드 등록");else matched.push("카드 등록 확인");
    if(!known.has("transitTrips"))unknown.push("월 대중교통 이용 횟수");else if(profile.transitTrips<15)failed.push("월 15회 이용 조건 미충족");else matched.push("월 15회 이상 이용");
    if(!known.has("monthlyTransitCost"))unknown.push("월 대상 교통비");
    if(!failed.length&&!unknown.length)amount=Math.round(profile.monthlyTransitCost*0.3);
  } else if(benefit.id.startsWith("culture-nuri"))checkAge(6);
  else if(benefit.id.startsWith("qnet"))checkAge(0,34);
  else if(benefit.id.startsWith("senior"))checkAge(65);
  else if(benefit.id.startsWith("seoul")){checkAge(19,39);if(!known.has("region"))unknown.push("현재 거주지");else if(!profile.region.startsWith("서울"))failed.push("서울 거주 조건 불일치");}
  const deadline = deadlineState(benefit, now);
  const closed = deadline.closed;
  const status = closed||failed.length ? "watch" : unknown.length ? "check" : "ready";
  const eligibilityStatus = failed.length ? "ineligible" : closed ? "closed" : unknown.length ? "needs_info" : "likely";
  const urgency=deadline.urgent?"urgent":"normal";
  return {...benefit,status,estimatedValue:status==="ready"?amount:0,matched,failed,unknown,eligibilityStatus,ruleVersion:RULE_VERSION,
    missing:unknown,confidence:0,urgency,matchReason:failed.join(" · ")||matched.join(" · ")||"아직 확인하지 않은 조건이 있습니다.",
    valueLabel:amount>0?`월 ${amount.toLocaleString("ko-KR")}원 추정 (정산액 아님)`:benefit.valueLabel,
    freshnessLabel:`원문 확인 ${benefit.sourceCheckedAt} · 현재 접수 여부 재확인`,
    amountBasis:benefit.id.startsWith("kpass")?"월 대상 교통비 × 30%의 단순 계산 예시. 지급 상한·대상 교통수단·정산 규정은 기관에서 확인해야 하며 지급 예상액을 보장하지 않습니다.":benefit.amountBasis} as Benefit & {matched:string[];failed:string[];unknown:string[];eligibilityStatus:string;ruleVersion:string};
}
export function valueTotals(items:Benefit[]) {
  return items.reduce((s,b)=>{if(b.status==="ready")s[b.valueCadence]+=b.estimatedValue;return s;},{monthly:0,annual:0,one_time:0,non_cash:0});
}

// Eligibility and calculation support are separate: missing inputs are not zero value.
export function benefitValueState(benefit: Benefit) {
  if (benefit.eligibilityStatus === "ineligible" || benefit.eligibilityStatus === "closed" || benefit.status === "watch") return "excluded";
  if (benefit.valueCadence === "non_cash") return "non_cash";
  if (benefit.status === "ready" && benefit.estimatedValue > 0) return "calculated";
  if (!benefit.id.startsWith("kpass")) return "calculation_pending";
  if (benefit.status !== "ready") return "needs_info";
  return "calculated_zero";
}
