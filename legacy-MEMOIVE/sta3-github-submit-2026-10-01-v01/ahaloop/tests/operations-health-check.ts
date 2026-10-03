import assert from "node:assert/strict";
import {evaluateOperationsHealth,type OperationsSnapshot} from "../lib/operations-health";

const now=Date.parse("2026-09-26T06:00:00.000Z");
const healthy:OperationsSnapshot={sourceChecks:[],notificationAttempts:[],pass:{sessions:0,firstBenefitViews:0,avgChoices:null},receiptAnomalies:0,overdueFollowups:0};
assert.equal(evaluateOperationsHealth(healthy,now).status,"healthy");

const unhealthy=evaluateOperationsHealth({
  sourceChecks:[{benefitId:"fixture",status:"failed",discoveredAt:"2026-09-26T05:00:00.000Z"},{benefitId:"changed",status:"changed",discoveredAt:"2026-09-26T01:00:00.000Z"}],
  notificationAttempts:[{channel:"sms",status:"unknown",createdAt:"2026-09-26T05:00:00.000Z",updatedAt:"2026-09-26T05:00:00.000Z"},{channel:"kakao",status:"sending",createdAt:"2026-09-26T05:00:00.000Z",updatedAt:"2026-09-26T05:00:00.000Z"}],
  pass:{sessions:5,firstBenefitViews:3,avgChoices:4},receiptAnomalies:1,overdueFollowups:2,
},now);
assert.equal(unhealthy.status,"critical");
assert.ok(unhealthy.alerts.some(alert=>alert.key==="source:fixture:failed"));
assert.ok(unhealthy.alerts.some(alert=>alert.key==="notification:sending-stuck"));
assert.ok(unhealthy.alerts.some(alert=>alert.key==="data:choice-gate"));
assert.ok(unhealthy.alerts.some(alert=>alert.key==="data:activation-drop"));
assert.ok(unhealthy.alerts.some(alert=>alert.key==="data:receipt-incomplete"));
assert.ok(unhealthy.alerts.some(alert=>alert.key==="followup:overdue"));
console.log("AHALOOP operations health: source, notification, data and follow-up alerts passed.");
