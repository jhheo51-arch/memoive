import { getD1Binding } from "@/db";
import { benefits } from "@/lib/benefit-catalog";
import { assess, valueTotals } from "@/lib/benefit-rules";
import { readProfile } from "@/lib/profile-model";
import { requestUser, apiError } from "@/lib/request-user";
export const dynamic="force-dynamic";
export async function GET(){
 try{const user=await requestUser();const db=getD1Binding();
 const row=await db.prepare("SELECT profile_data FROM user_profiles WHERE user_id=?").bind(user).first<Record<string,unknown>>();
 const apps=await db.prepare("SELECT * FROM benefit_applications WHERE user_id=? ORDER BY updated_at DESC").bind(user).all();
 const catalog=benefits.map(b=>assess(b,readProfile(row)));
 return Response.json({benefits:catalog,applications:apps.results,totals:valueTotals(catalog),dataMode:"pilot"});
 }catch(e){return apiError(e);}
}
