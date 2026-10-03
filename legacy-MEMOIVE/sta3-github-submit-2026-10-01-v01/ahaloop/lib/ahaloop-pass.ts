import type { Benefit } from "./benefit-catalog";
import type { ProfileData } from "./profile-model";

export const PASS_CORE_FIELDS = ["region", "age", "employmentStatus"] as const;
export type PassCoreField = (typeof PASS_CORE_FIELDS)[number];

export function passProgress(profile: ProfileData) {
  const confirmed = new Set(profile.confirmedFields);
  const completed = PASS_CORE_FIELDS.filter((field) => confirmed.has(field));
  const next = PASS_CORE_FIELDS.find((field) => !confirmed.has(field)) ?? null;
  return {
    completed: completed.length,
    total: PASS_CORE_FIELDS.length,
    isReady: completed.length === PASS_CORE_FIELDS.length,
    next,
  };
}

export function activeBenefitQuestion(benefit: Pick<Benefit, "missing">) {
  return benefit.missing[0] ?? null;
}

export const PASS_EVENT_TYPES = [
  "pass_session_started",
  "pass_core_choice",
  "pass_first_benefit_viewed",
  "pass_next_question_viewed",
  "pass_official_source_opened",
] as const;

export const PASS_KPI_TARGETS = {
  choicesToFirstBenefit: 3,
  activeQuestionsPerScreen: 1,
  primaryOutcome: "수령·이용 완료 사용자",
  guardrails: ["판정 정정률", "첫 혜택 전 민감정보 요구 건수", "공식 신청 오인 건수"],
} as const;
