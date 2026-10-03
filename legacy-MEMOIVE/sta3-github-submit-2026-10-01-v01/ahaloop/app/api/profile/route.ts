import { getD1Binding } from "@/db";
import { emptyProfile, readProfile } from "@/lib/profile-model";
import { requestUser, apiError } from "@/lib/request-user";
import { z } from "zod";
export const dynamic="force-dynamic";
const schema=z.object({
 name:z.string().trim().min(1).max(40),birthYear:z.number().int().min(0).max(new Date().getFullYear()),
 age:z.number().int().min(0).max(110).nullable(),region:z.string().max(80),
 employmentStatus:z.enum(["","student","employed","job_seeking","homemaker","retired","self_employed"]),
 housingStatus:z.enum(["","monthly_rent","jeonse","owner","family","other"]),
 annualIncome:z.number().min(0).max(1000000),monthlyTransitCost:z.number().int().min(0).max(10000000),
 hasStudentLoan:z.boolean(),lifeEvent:z.string().max(60),preferredChannel:z.enum(["kakao","sms","email"]),
 consent:z.boolean(),profileStatement:z.string().max(500),profileContext:z.array(z.string().max(200)).max(30),
 householdType:z.string().max(40),careNeeds:z.array(z.string().max(30)).max(10),
 confirmedFields:z.array(z.enum(Object.keys(emptyProfile) as [string,...string[]])).max(30),
 kpassRegistered:z.boolean(),transitTrips:z.number().int().min(0).max(500),
});
export async function GET() {
 try {const userId=await requestUser();const row=await getD1Binding().prepare("SELECT * FROM user_profiles WHERE user_id=?").bind(userId).first<Record<string,unknown>>();
 return Response.json({profile:readProfile(row),dataMode:row?.data_mode??"pilot",saved:!!row?.confirmed_at});}
 catch(e){return apiError(e);}
}
export async function POST(request:Request) {
 try {
 const userId=await requestUser(); const parsed=schema.safeParse({...emptyProfile,...z.record(z.unknown()).parse(await request.json())});
 if(!parsed.success)return Response.json({error:"조건의 형식·숫자 범위를 확인해 주세요."},{status:400});
 const p=parsed.data;const db=getD1Binding();const old=await db.prepare("SELECT profile_data,status FROM user_profiles WHERE user_id=?").bind(userId).first<Record<string,unknown>>();
 const now=new Date().toISOString();
 const queries=[db.prepare(`INSERT INTO user_profiles
 (user_id,name,interest_topics,interest_roles,content_types,preferred_channel,birth_year,region,employment_status,housing_status,annual_income,monthly_transit_cost,has_student_loan,life_event,household_type,care_needs,restart_consent,status,updated_at,profile_data,data_mode,confirmed_at)
 VALUES (?,?, '[]','[]','[]',?,?,?,?,?,?,?,?,?,?,?,?,'active',?,?,'pilot',?)
 ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,preferred_channel=excluded.preferred_channel,
 birth_year=excluded.birth_year,region=excluded.region,employment_status=excluded.employment_status,
 household_type=excluded.household_type,housing_status=excluded.housing_status,annual_income=excluded.annual_income,
 monthly_transit_cost=excluded.monthly_transit_cost,has_student_loan=excluded.has_student_loan,life_event=excluded.life_event,care_needs=excluded.care_needs,
 restart_consent=excluded.restart_consent,profile_data=excluded.profile_data,
 confirmed_at=excluded.confirmed_at,updated_at=excluded.updated_at`)
 .bind(userId,p.name,p.preferredChannel,p.birthYear,p.region,p.employmentStatus,p.housingStatus,p.annualIncome,p.monthlyTransitCost,p.hasStudentLoan?1:0,p.lifeEvent,p.householdType,JSON.stringify(p.careNeeds),p.consent?1:0,now,JSON.stringify(p),now),
 db.prepare("INSERT INTO events (user_id,event_type,event_at,properties) VALUES (?,?,?,?)").bind(userId,"profile_confirmed",now,JSON.stringify({fields:p.confirmedFields,ruleVersion:"2026-09-18-v2"}))];
 const before=readProfile(old);
 if(!old||before.consent!==p.consent||before.preferredChannel!==p.preferredChannel) {
 queries.push(db.prepare("INSERT INTO consent_logs (user_id,channel,purpose,agreed,agreed_at,withdrawn_at) VALUES (?,?,'benefit_recovery',?,?,?)").bind(userId,p.preferredChannel,p.consent?1:0,p.consent?now:null,p.consent?null:now));
 }
 await db.batch(queries);return Response.json({ok:true,profile:p});
 }catch(e){return apiError(e);}
}
