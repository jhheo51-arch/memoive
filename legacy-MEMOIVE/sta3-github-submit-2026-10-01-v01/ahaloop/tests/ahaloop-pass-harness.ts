import assert from "node:assert/strict";
import { activeBenefitQuestion, PASS_KPI_TARGETS, passProgress } from "../lib/ahaloop-pass";
import { emptyProfile, selectProfileField } from "../lib/profile-model";

let profile = { ...emptyProfile, confirmedFields: [] as string[] };
assert.deepEqual(passProgress(profile), { completed: 0, total: 3, isReady: false, next: "region" });

profile = selectProfileField(profile, "region", "서울특별시");
assert.equal(passProgress(profile).completed, 1);
profile = selectProfileField(profile, "age", 34);
assert.equal(passProgress(profile).completed, 2);
profile = selectProfileField(profile, "employmentStatus", "job_seeking");
assert.deepEqual(passProgress(profile), { completed: 3, total: 3, isReady: true, next: null });

assert.equal(
  activeBenefitQuestion({ missing: ["가구 소득", "재산", "신청 이력"] }),
  "가구 소득",
);
assert.equal(activeBenefitQuestion({ missing: [] }), null);
assert.equal(PASS_KPI_TARGETS.choicesToFirstBenefit, 3);
assert.equal(PASS_KPI_TARGETS.activeQuestionsPerScreen, 1);

console.log("AHALOOP PASS harness: 3회 선택 게이트와 한 화면 1질문 규칙을 통과했습니다.");
