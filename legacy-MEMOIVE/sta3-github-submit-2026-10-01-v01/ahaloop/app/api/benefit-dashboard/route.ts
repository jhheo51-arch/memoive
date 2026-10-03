import { getD1Binding } from "@/db";
import { requestUser, apiError } from "@/lib/request-user";
export const dynamic="force-dynamic";
export async function GET(){
 try{const user=await requestUser();const db=getD1Binding();
 const [profiles,apps,events,pass]=await db.batch([
 db.prepare("SELECT employment_status,COUNT(*) count FROM user_profiles WHERE user_id=? AND profile_data IS NOT NULL GROUP BY employment_status").bind(user),
 db.prepare("SELECT * FROM benefit_applications WHERE user_id=?").bind(user),
 db.prepare("SELECT event_type,COUNT(*) count FROM events WHERE user_id=? GROUP BY event_type").bind(user),
 db.prepare(`SELECT
   COUNT(DISTINCT CASE WHEN event_type='pass_session_started' THEN json_extract(properties,'$.sessionId') END) sessions,
   COUNT(DISTINCT CASE WHEN event_type='pass_first_benefit_viewed' THEN json_extract(properties,'$.sessionId') END) first_benefit_views,
   ROUND(AVG(CASE WHEN event_type='pass_first_benefit_viewed' THEN CAST(json_extract(properties,'$.choiceCount') AS REAL) END),1) avg_choices,
   ROUND(AVG(CASE WHEN event_type='pass_first_benefit_viewed' THEN CAST(json_extract(properties,'$.elapsedMs') AS REAL) END)) avg_elapsed_ms,
   SUM(CASE WHEN event_type='pass_next_question_viewed' THEN 1 ELSE 0 END) question_views
   FROM events WHERE user_id=? AND event_type LIKE 'pass_%'`).bind(user)]);
 const rows=(apps.results??[]) as Record<string,unknown>[];const has=(states:string[])=>Number(rows.some(r=>states.includes(String(r.stage))));
 const passRow=(pass.results?.[0]??{}) as Record<string,unknown>;
 return Response.json({scope:"내 계정의 파일럿 데이터 · 데모 제외 · 사용자 단위",live:{
 targetProfiles:profiles.results.length?1:0,prepared:has(["checking","documents","submitted","approved","received"]),
 submitted:has(["submitted","approved","received"]),received:Number(rows.some(r=>r.received_at)),
 receivedValue:rows.filter(r=>r.receipt_method==="self_report").reduce((s,r)=>s+Number(r.received_amount??0),0)},
 segments:profiles.results,events:events.results,applications:rows.length,pass:{
  sessions:Number(passRow.sessions??0),firstBenefitViews:Number(passRow.first_benefit_views??0),
  avgChoices:passRow.avg_choices===null?null:Number(passRow.avg_choices),
  avgElapsedMs:passRow.avg_elapsed_ms===null?null:Number(passRow.avg_elapsed_ms),
  questionViews:Number(passRow.question_views??0)},
 evidenceLevel:"사용자 자기보고 · 기관 확인 아님"});
 }catch(e){return apiError(e);}
}
