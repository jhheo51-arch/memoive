import { getD1Binding } from "@/db";
import { benefits } from "@/lib/benefit-catalog";
import { assess, RULE_VERSION } from "@/lib/benefit-rules";
import { readProfile } from "@/lib/profile-model";
import { requestUser, apiError } from "@/lib/request-user";
import { z } from "zod";
const payloadSchema=z.object({benefitId:z.string(),action:z.enum(["start","watch","advance","receipt"]),fromStage:z.string().optional(),confirmedExternal:z.boolean().optional(),amount:z.number().optional(),receivedAt:z.string().optional()});
const stages=["checking","documents","submitted","approved","received"];
export async function POST(request:Request){
 try{
 const user=await requestUser();const parsed=payloadSchema.safeParse(await request.json());if(!parsed.success)return Response.json({error:"요청 형식을 확인해 주세요."},{status:400});const p=parsed.data;const b=benefits.find(b=>b.id===p.benefitId);
 if(!b||!["start","watch","advance","receipt"].includes(p.action))return Response.json({error:"혜택과 행동을 확인해 주세요."},{status:400});
 const db=getD1Binding();const row=await db.prepare("SELECT profile_data FROM user_profiles WHERE user_id=?").bind(user).first<Record<string,unknown>>();
 if(!row?.profile_data)return Response.json({error:"내 조건을 먼저 확인·저장해 주세요."},{status:409});
 const result=assess(b,readProfile(row));
 const current=await db.prepare("SELECT * FROM benefit_applications WHERE user_id=? AND benefit_id=?").bind(user,b.id).first<Record<string,unknown>>();
 let stage=p.action==="watch"?"watching":"checking";
 if(p.action==="start"&&current&&current.stage!=="watching")return Response.json({ok:true,application:current});
 if(p.action==="watch"&&current&&current.stage!=="watching")return Response.json({error:"진행 중인 신청을 감시 상태로 되돌릴 수 없습니다."},{status:409});
 if(p.action==="advance"){
  const i=stages.indexOf(String(current?.stage));
  if(i<0||i>=3)return Response.json({error:i===3?"수령일·실제 금액을 입력해 주세요.":"현재 단계에서는 이동할 수 없습니다."},{status:409});
  if(p.fromStage!==current?.stage)return Response.json({error:"상태가 바뀌었습니다. 새로고침 후 확인해 주세요."},{status:409});
  stage=stages[i+1];
 }
 if(p.action==="receipt"){
  if(current?.stage!=="approved")return Response.json({error:"승인 상태에서 수령을 기록할 수 있습니다."},{status:409});
  if(!p.receivedAt||!/^\d{4}-\d{2}-\d{2}$/.test(p.receivedAt)||!Number.isFinite(Date.parse(p.receivedAt))||new Date(p.receivedAt).toISOString().slice(0,10)!==p.receivedAt||p.receivedAt>new Date().toISOString().slice(0,10))return Response.json({error:"실제 수령·이용일을 확인해 주세요."},{status:400});
  if(b.valueCadence!=="non_cash"&&(p.amount===undefined||!Number.isSafeInteger(p.amount)||p.amount<=0||p.amount>100000000))return Response.json({error:"실제로 받은 금액을 입력해 주세요."},{status:400});
  stage="received";
 }
 if(["checking","documents","submitted"].includes(stage)&&["ineligible","closed"].includes(result.eligibilityStatus))return Response.json({error:"현재 대상 조건 또는 접수 기간을 충족하지 않습니다. 변화 감시를 선택해 주세요."},{status:409});
 if((stage==="submitted"||stage==="approved"||stage==="received")&&p.confirmedExternal!==true)return Response.json({error:"기관에서 직접 진행한 사실을 확인해 주세요. 이 버튼은 외부 신청을 대신하지 않습니다."},{status:400});
 const id=String(current?.application_id??crypto.randomUUID());const now=new Date().toISOString();
 const amount=p.action==="receipt"&&b.valueCadence!=="non_cash"?p.amount:null;
 const method=p.action==="receipt"?(b.valueCadence==="non_cash"?"service_self_report":"self_report"):null;
 const saved=await db.batch([
 db.prepare(`INSERT INTO benefit_applications (application_id,user_id,benefit_id,stage,eligibility_status,expected_value,created_at,updated_at,rule_version,received_amount,received_at,receipt_method)
 VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,benefit_id) DO UPDATE SET stage=excluded.stage,eligibility_status=excluded.eligibility_status,expected_value=excluded.expected_value,updated_at=excluded.updated_at,rule_version=excluded.rule_version,received_amount=COALESCE(excluded.received_amount,benefit_applications.received_amount),received_at=COALESCE(excluded.received_at,benefit_applications.received_at),receipt_method=COALESCE(excluded.receipt_method,benefit_applications.receipt_method) WHERE benefit_applications.stage=?`)
 .bind(id,user,b.id,stage,result.eligibilityStatus,result.estimatedValue,now,now,RULE_VERSION,amount??null,p.action==="receipt"?p.receivedAt:null,method,current?.stage??"__new__"),
 db.prepare("INSERT INTO events (user_id,content_id,event_type,event_at,properties) SELECT ?,?,?,?,? WHERE changes()>0").bind(user,b.id,`benefit_${stage}`,now,JSON.stringify({applicationId:id,fromStage:current?.stage??null,toStage:stage,ruleVersion:RULE_VERSION,receiptMethod:method}))
 ]);
 if(!saved[0].meta.changes)return Response.json({error:"다른 요청으로 단계가 변경됐습니다. 새로고침 후 확인해 주세요."},{status:409});
 return Response.json({ok:true,stage});
 }catch(e){return apiError(e);}
}
