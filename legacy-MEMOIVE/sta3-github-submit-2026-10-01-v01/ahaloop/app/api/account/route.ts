import { getD1Binding } from "@/db";
import { requestUser, apiError } from "@/lib/request-user";
import { z } from "zod";

export const dynamic="force-dynamic";
const payloadSchema=z.object({confirmation:z.literal("내 데이터 삭제")}).strict();

export async function DELETE(request:Request) {
  try {
    const userId=await requestUser();
    const parsed=payloadSchema.safeParse(await request.json());
    if(!parsed.success)return Response.json({error:"확인 문구 ‘내 데이터 삭제’를 정확히 입력해 주세요."},{status:400});
    const db=getD1Binding();
    await db.batch([
      db.prepare("DELETE FROM notification_attempts WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM portfolio_records WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM source_reviews WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM experiment_assignments WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM pilot_sessions WHERE operator_user_id=?").bind(userId),
      db.prepare("DELETE FROM operational_alerts WHERE operator_user_id=?").bind(userId),
      db.prepare("DELETE FROM operations_health_runs WHERE operator_user_id=?").bind(userId),
      db.prepare("DELETE FROM benefit_applications WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM consent_logs WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM sends WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM events WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM followup_tasks WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM evaluations WHERE user_id=?").bind(userId),
      db.prepare("DELETE FROM user_profiles WHERE user_id=?").bind(userId),
    ]);
    return Response.json({ok:true,message:"이 계정의 아하루프 저장 자료를 삭제했습니다. 공유 혜택 목록은 삭제 대상이 아닙니다."});
  } catch(error) { return apiError(error); }
}
