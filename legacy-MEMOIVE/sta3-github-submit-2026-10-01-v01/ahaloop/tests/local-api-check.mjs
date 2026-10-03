// Local-only integration check. Uses fabricated data; never point this at production.
import assert from "node:assert/strict";
import {emptyProfile,interpret} from "../lib/profile-model.ts";
const origin="http://localhost:5173";
async function api(path,body,auth=true){const r=await fetch(origin+path,{method:body?"POST":"GET",headers:{...(auth?{Cookie:"__sites_local_auth=1"}:{}),"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
const signedOutPage=await fetch(origin+"/",{redirect:"manual"});
assert.ok([302,303,307,308].includes(signedOutPage.status),"signed-out customer is sent to ChatGPT sign-in");
assert.match(signedOutPage.headers.get("location")??"",/^\/signin-with-chatgpt\?return_to=/);
assert.equal((await fetch(origin+"/",{headers:{Cookie:"__sites_local_auth=1"}})).status,200,"signed-in customer can open the journey");
assert.equal((await api("/api/profile",null,false)).status,401);
const p={...emptyProfile,...interpret("서울에 사는 만 27세 직장인이고 혼자 월세로 살아요.").patch,name:"로컬 검증용",kpassRegistered:true,transitTrips:20,monthlyTransitCost:60000,consent:false};
p.confirmedFields.push("kpassRegistered","transitTrips","monthlyTransitCost");
assert.equal((await api("/api/profile",{...p,userId:"another-customer"})).status,200,"profile save");
const session=await api("/api/session");assert.equal(session.status,200);assert.equal(session.data.role,"operator");assert.equal(session.data.retention.activityDays,180);
const pilotBefore=await api("/api/pilot");assert.equal(pilotBefore.status,200);assert.equal(pilotBefore.data.target,5);
assert.equal((await api("/api/pilot",{participantCode:"P01",status:"observed",consentStatus:"pending",choicesToFirstBenefit:3,firstBenefitElapsedSeconds:45,firstBenefitId:"kpass-youth-2026",preparationStarted:true,stopPoint:"",observation:"합성 로컬 검사"})).status,400,"observation requires consent");
assert.equal((await api("/api/pilot",{participantCode:"P01",status:"observed",consentStatus:"agreed",choicesToFirstBenefit:3,firstBenefitElapsedSeconds:45,firstBenefitId:"kpass-youth-2026",preparationStarted:true,stopPoint:"",observation:"합성 로컬 검사"})).status,200);
const operationsHealth=await api("/api/operations-health");assert.equal(operationsHealth.status,200);assert.equal(operationsHealth.data.status,"healthy");
assert.equal((await api("/api/benefit-sources/youth-center",{},false)).status,401,"Youth Center connection check requires login");
assert.equal((await api("/api/benefit-sources/youth-center",{})).status,409,"Youth Center adapter stays locked without a server key");
const saved=await api("/api/profile");assert.equal(saved.data.profile.name,p.name);assert.equal(saved.data.profile.userId,undefined,"client ID ignored");
const passSession=crypto.randomUUID();
assert.equal((await api("/api/pass-event",{eventType:"pass_session_started",sessionId:passSession})).status,201);
for(const [step,choiceCount] of [["region",1],["age",2],["employmentStatus",3]])assert.equal((await api("/api/pass-event",{eventType:"pass_core_choice",sessionId:passSession,step,choiceCount})).status,201);
assert.equal((await api("/api/pass-event",{eventType:"pass_first_benefit_viewed",sessionId:passSession,choiceCount:3,elapsedMs:12000})).status,201);
assert.equal((await api("/api/pass-event",{eventType:"pass_first_benefit_viewed",sessionId:passSession,choiceCount:3,elapsedMs:12000})).data.recorded,false,"first view deduplicated per session");
const list=await api("/api/benefits");assert.equal(list.status,200);assert.equal(list.data.totals.monthly,18000);assert.equal(list.data.totals.one_time,0);
const id="kpass-youth-2026";
let stage=list.data.applications.find(a=>a.benefit_id===id)?.stage;
if(!stage){assert.equal((await api("/api/benefit-action",{benefitId:id,action:"start"})).status,200);stage="checking";}
if(stage!=="received"){
 assert.equal((await api("/api/benefit-action",{benefitId:id,action:"advance",fromStage:"invalid"})).status,409);
 for(const current of ["checking","documents","submitted"]){if(stage!==current)continue;const r=await api("/api/benefit-action",{benefitId:id,action:"advance",fromStage:current,confirmedExternal:true});assert.equal(r.status,200,JSON.stringify(r));stage=r.data.stage;}
 assert.equal((await api("/api/benefit-action",{benefitId:id,action:"receipt",amount:-1,receivedAt:"2026-09-18",confirmedExternal:true})).status,400);
 assert.equal((await api("/api/benefit-action",{benefitId:id,action:"receipt",amount:12345,receivedAt:"2026-09-18",confirmedExternal:true})).status,200);
}
const dash=await api("/api/benefit-dashboard");assert.equal(dash.data.live.receivedValue,12345,"actual input, not 18000 estimate");assert.equal(dash.data.live.prepared,1);assert.ok(dash.data.pass.sessions>=1);assert.equal(dash.data.pass.avgChoices,3);
const plan=await api("/api/portfolio",{action:"campaign"});assert.equal(plan.status,200);assert.equal(plan.data.plan.actualSent,0);assert.ok(plan.data.plan.blockedReasons.some(x=>x.includes("동의")));
assert.equal((await api("/api/portfolio",{action:"record",kind:"decision",title:"합성 QA 기록",body:"실제 고객이 아닌 로컬 통합 테스트에서 저장·재조회 동작을 확인합니다.",status:"draft"})).status,200);
assert.equal((await api("/api/action",{eventType:"preview_action",contentId:id})).status,201);
assert.equal((await api("/api/action",{eventType:"notification_action",contentId:id})).status,400,"no fake campaign attribution");
assert.equal((await api("/api/send",{})).status,409,"real send blocked");
assert.equal((await api("/api/notification-test",null,false)).status,401,"notification status requires login");
assert.equal((await api("/api/notification-test",{channel:"sms",confirmed:true},false)).status,401);
const connection=await api("/api/notification-test");assert.equal(connection.status,200);assert.equal(connection.data.sms.ready,false);assert.equal(connection.data.recipient,null);
assert.equal((await api("/api/notification-test",{channel:"sms",confirmed:false})).status,400);
assert.equal((await api("/api/notification-test",{channel:"sms",confirmed:true,to:"01000000000"})).status,400,"client cannot supply recipient");
assert.equal((await api("/api/notification-test",{channel:"sms",confirmed:true})).status,409,"missing secrets never send");
const final=await api("/api/portfolio");assert.ok(final.data.records.some(r=>r.title==="합성 QA 기록"));assert.ok(final.data.events.some(e=>e.event_type==="benefit_received"));
console.log("Local integration passed: page sign-in, login/role gate, pilot consent, retention policy, profile, AHALOOP PASS events, client-ID rejection, units, state conflict, receipt validation, actual amount, consent blocking, record persistence, preview separation, real-send blocking.");
