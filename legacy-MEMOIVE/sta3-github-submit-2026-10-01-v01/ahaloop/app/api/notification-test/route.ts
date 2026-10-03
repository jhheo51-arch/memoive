import { env } from "cloudflare:workers";
import { getD1Binding } from "@/db";
import { requireOperator, apiError } from "@/lib/request-user";
import { notificationReadiness, sendPilotNotification, TEST_NOTIFICATION_TEXT, type NotificationConfig } from "@/lib/notification-provider";
import { z } from "zod";
export const dynamic="force-dynamic";
export async function GET() {
  try {
    const user=await requireOperator();const config=env as unknown as NotificationConfig;
    const attempts=await getD1Binding().prepare("SELECT channel,status,created_at FROM notification_attempts WHERE user_id=? ORDER BY created_at DESC LIMIT 10").bind(user).all();
    return Response.json({sms:notificationReadiness(config,user,"sms"),kakao:notificationReadiness(config,user,"kakao"),recipient:config.NOTIFICATION_PILOT_USER_ID===user&&config.NOTIFICATION_PILOT_PHONE?`010-****-${config.NOTIFICATION_PILOT_PHONE.slice(-4)}`:null,text:TEST_NOTIFICATION_TEXT,attempts:attempts.results,mode:"operator_pilot"},{headers:{"Cache-Control":"no-store"}});
  }catch(e){return apiError(e);}
}
export async function POST(request:Request) {
  try {
    const user=await requireOperator();const parsed=z.object({channel:z.enum(["sms","kakao"]),confirmed:z.literal(true)}).strict().safeParse(await request.json());
    if(!parsed.success)return Response.json({error:"보낼 채널과 유료 테스트 수신 동의를 확인해 주세요."},{status:400});
    const config=env as unknown as NotificationConfig;const readiness=notificationReadiness(config,user,parsed.data.channel);
    if(!readiness.ready)return Response.json({error:readiness.reasons.join(" · ")},{status:409});
    const now=new Date().toISOString();const day=new Date(Date.now()+9*3600000).toISOString().slice(0,10);const id=crypto.randomUUID();const db=getD1Binding();
    // Atomic daily reservation includes failures/unknowns to prevent billable duplicate retries.
    const reserved=await db.prepare("INSERT OR IGNORE INTO notification_attempts (id,user_id,channel,day,status,created_at,updated_at) VALUES (?,?,?,?,'sending',?,?)").bind(id,user,parsed.data.channel,day,now,now).run();
    if(!reserved.meta.changes)return Response.json({error:"오늘 테스트 요청 기록이 있습니다. 중복 과금을 막기 위해 재발송하지 않습니다. 업체 발송 내역을 확인해 주세요."},{status:409});
    const result=await sendPilotNotification(config,parsed.data.channel,id);
    await db.prepare("UPDATE notification_attempts SET status=?,provider_message_id=?,provider_group_id=?,updated_at=? WHERE id=? AND user_id=?").bind(result.status,result.messageId,result.groupId,new Date().toISOString(),id,user).run();
    return Response.json({status:result.status,message:result.status==="accepted"?"업체가 요청을 접수했습니다. 휴대폰 도착은 아직 확인되지 않았습니다.":result.status==="failed"?"업체가 발송 요청을 거절했습니다. 업체 설정·잔액·템플릿을 확인해 주세요.":"접수 여부를 확인하지 못했습니다. 다시 보내지 말고 업체 발송 내역을 확인해 주세요."},{status:result.status==="accepted"?202:502});
  }catch(e) {if(e instanceof Error&&(e.message.includes("로그인")||e.message.includes("운영자 권한")))return apiError(e);return Response.json({error:"발송 기록을 확인하지 못했습니다. 중복 발송 방지를 위해 업체 내역 확인 전 재시도하지 마세요."},{status:503});}
}
