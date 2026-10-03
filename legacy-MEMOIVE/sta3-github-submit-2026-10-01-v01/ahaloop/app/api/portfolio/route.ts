import {getD1Binding} from "@/db";
import {requireOperator,apiError} from "@/lib/request-user";
import {benefits} from "@/lib/benefit-catalog";
import {assess,RULE_VERSION} from "@/lib/benefit-rules";
import {readProfile} from "@/lib/profile-model";
import {z} from "zod";
export const dynamic="force-dynamic";
export async function GET(){
 try{const user=await requireOperator();const db=getD1Binding();
 const [records,reviews,events,cohorts,assignments]=await db.batch([
  db.prepare("SELECT * FROM portfolio_records WHERE user_id=? ORDER BY created_at DESC LIMIT 100").bind(user),
  db.prepare("SELECT * FROM source_reviews WHERE user_id=? ORDER BY discovered_at DESC LIMIT 30").bind(user),
  db.prepare("SELECT event_type,content_id,event_at,properties FROM events WHERE user_id=? ORDER BY event_at DESC LIMIT 100").bind(user),
  db.prepare(`WITH starts AS (SELECT user_id,content_id,MIN(event_at) started_at FROM events WHERE user_id=? AND event_type='benefit_checking' GROUP BY user_id,content_id)
   SELECT strftime('%Y-%W',started_at) cohort,COUNT(*) started,
   SUM(CASE WHEN EXISTS(SELECT 1 FROM events e WHERE e.user_id=a.user_id AND e.content_id=a.content_id AND e.event_type='benefit_submitted' AND julianday(e.event_at)-julianday(a.started_at) BETWEEN 0 AND 7) THEN 1 ELSE 0 END) submitted7d,
   SUM(CASE WHEN julianday('now')-julianday(started_at)>=7 THEN 1 ELSE 0 END) mature
   FROM starts a GROUP BY cohort`).bind(user),
  db.prepare("SELECT experiment_id,variant,assigned_at FROM experiment_assignments WHERE user_id=?").bind(user)]);
 return Response.json({records:records.results,reviews:reviews.results,events:events.results,cohorts:cohorts.results,assignments:assignments.results,scope:"내 계정만 · 파일럿 기록 · 실제 고객 성과와 구분",ruleVersion:RULE_VERSION});
 }catch(e){return apiError(e);}
}
const recordSchema=z.object({kind:z.enum(["decision","research","experiment"]),title:z.string().trim().min(3).max(120),body:z.string().trim().min(10).max(5000),status:z.enum(["draft","observed","decided"]).default("draft")});
const requestSchema=z.discriminatedUnion("action",[
 recordSchema.extend({action:z.literal("record")}),
 z.object({action:z.literal("review"),id:z.string(),status:z.enum(["approved","rejected"]),note:z.string().min(10).max(1500)}),
 z.object({action:z.literal("collect"),benefitId:z.string()}),
 z.object({action:z.literal("campaign")}),z.object({action:z.literal("assign")}),
]);
export async function POST(request:Request){
 try{const user=await requireOperator();const parsed=requestSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"필수 입력과 글자 수를 확인해 주세요."},{status:400});const p=parsed.data;const db=getD1Binding();const now=new Date().toISOString();
 if(p.action==="record"){
  const r=recordSchema.safeParse(p);if(!r.success)return Response.json({error:"제목 3~120자, 내용 10~5,000자를 입력해 주세요."},{status:400});
  await db.prepare("INSERT INTO portfolio_records (id,user_id,kind,title,body,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user,r.data.kind,r.data.title,r.data.body,r.data.status,now,now).run();
  return Response.json({ok:true,message:"근거 기록을 저장했습니다."});
 }
 if(p.action==="review"){
  if(!["approved","rejected"].includes(p.status)||typeof p.note!=="string"||p.note.trim().length<10||p.note.length>1500)return Response.json({error:"검토 근거를 10~1,500자로 적어 주세요."},{status:400});
  const result=await db.prepare("UPDATE source_reviews SET status=?,note=?,reviewed_at=? WHERE id=? AND user_id=? AND status IN ('pending','changed')").bind(p.status,p.note.trim(),now,p.id,user).run();
  if(!result.meta.changes)return Response.json({error:"검수할 대기 기록이 없습니다."},{status:409});
  return Response.json({ok:true,message:"개인 검수 기록을 저장했습니다. 공개 판정 규칙·발송에는 자동 반영하지 않습니다."});
 }
 if(p.action==="collect"){
  const b=benefits.find(b=>b.id===p.benefitId);if(!b)return Response.json({error:"등록된 공식 출처만 조회할 수 있습니다."},{status:400});
  const last=await db.prepare("SELECT * FROM source_reviews WHERE user_id=? AND benefit_id=? ORDER BY discovered_at DESC LIMIT 1").bind(user,b.id).first<Record<string,unknown>>();
  const previous=await db.prepare("SELECT * FROM source_reviews WHERE user_id=? AND benefit_id=? AND content_hash IS NOT NULL ORDER BY discovered_at DESC LIMIT 1").bind(user,b.id).first<Record<string,unknown>>();
  if(last&&Date.now()-Date.parse(String(last.discovered_at))<60000)return Response.json({error:"같은 출처는 1분 후 다시 확인해 주세요."},{status:429});
  let excerpt="",hash="",status="failed",note="";
  try{
   const response=await fetch(b.sourceUrl,{redirect:"manual",signal:AbortSignal.timeout(12000),headers:{Accept:"text/html,application/json,text/plain"}});
   if(!response.ok)throw new Error(`공식 원문 응답 ${response.status}`);
   const reader=response.body?.getReader();if(!reader)throw new Error("원문이 비어 있습니다.");
   const chunks:Uint8Array[]=[];let size=0;
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1000000){await reader.cancel();throw new Error("원문이 허용 크기를 넘었습니다. 수동 확인 필요");}chunks.push(value);}
   const buffer=new Uint8Array(size);let offset=0;for(const c of chunks){buffer.set(c,offset);offset+=c.length;}
   const html=new TextDecoder().decode(buffer);
   const normalized=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
   if(normalized.length<100)throw new Error("확인 가능한 본문 부족. 수동 확인 필요");
   hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(normalized)))).map(b=>b.toString(16).padStart(2,"0")).join("");
   excerpt=normalized.slice(0,5000);status=previous?.content_hash===hash?"unchanged":previous?.content_hash?"changed":"pending";
   note="전체 본문 해시 비교. 메뉴·날짜 변경도 감지할 수 있어 자격 변경을 의미하지 않습니다. 발췌 5,000자 밖의 차이는 원문 대조 필요.";
  }catch(e){note=e instanceof Error?e.message:"원문 조회 실패";}
  await db.prepare("INSERT INTO source_reviews (id,user_id,benefit_id,source_url,content_hash,excerpt,previous_excerpt,status,note,discovered_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user,b.id,b.sourceUrl,hash||null,excerpt||null,previous?.excerpt??null,status,note,now).run();
  return Response.json({ok:true,message:status==="failed"?`수집 실패를 기록했습니다: ${note}`:status==="unchanged"?"이전 원문과 같은 내용입니다.":"원문을 수집했습니다. 변경 여부와 자격 조건을 검수해 주세요."});
 }
 if(p.action==="campaign"||p.action==="assign"){
  const row=await db.prepare("SELECT * FROM user_profiles WHERE user_id=?").bind(user).first<Record<string,unknown>>();const profile=readProfile(row);
  const appRows=await db.prepare("SELECT * FROM benefit_applications WHERE user_id=?").bind(user).all();
  const candidates=benefits.map(b=>assess(b,profile)).filter(b=>b.status==="ready"&&!appRows.results.some(a=>a.benefit_id===b.id));
  const consent=await db.prepare("SELECT agreed FROM consent_logs WHERE user_id=? AND channel=? AND purpose='benefit_recovery' ORDER BY id DESC LIMIT 1").bind(user,profile.preferredChannel).first<{agreed:number}>();
  const hour=(new Date().getUTCHours()+9)%24;const reasons:string[]=[];
  if(!profile.consent||!consent?.agreed)reasons.push("채널별 혜택 알림 동의 없음");
  if(row?.status==="paused")reasons.push("수신 중지 상태");
  if(!candidates.length)reasons.push("조건 후보 충족·미시작 대상 없음");
  if(hour<9||hour>=20)reasons.push("조용한 시간 20:00–09:00 (한국)");
  if(p.action==="assign"){
   if(reasons.length)return Response.json({error:reasons.join(" · ")},{status:409});
   await db.prepare("INSERT OR IGNORE INTO experiment_assignments (id,user_id,experiment_id,variant,assigned_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(),user,"next-action-v1",crypto.getRandomValues(new Uint8Array(1))[0]%2?"B":"A",now).run();
   return Response.json({ok:true,message:"고객 단위 문구 그룹을 고정 배정했습니다. 실제 발송·노출 전에는 전환 효과로 집계하지 않습니다."});
  }
  const plan={eligible:candidates.map(b=>({id:b.id,title:b.title})),blockedReasons:reasons,providerConnected:false,actualSent:0,checkedAt:now,policy:"동일 고객·혜택·사유·회차 중복 금지 / 24시간 1회 목표 / 제공업체 연결 전 실제 발송 차단"};
  await db.prepare("INSERT INTO portfolio_records (id,user_id,kind,title,body,status,created_at,updated_at) VALUES (?,?, 'campaign',?,?, 'observed',?,?)").bind(crypto.randomUUID(),user,"발송 전 조건 검사",JSON.stringify(plan),now,now).run();
  return Response.json({ok:true,plan,message:"발송 전 조건을 검사했습니다. 제공업체 미연결로 실제 발송은 0건입니다."});
 }
 return Response.json({error:"지원하지 않는 요청입니다."},{status:400});
 }catch(e){return apiError(e);}
}
