import { getD1Binding } from "@/db";
import { requestActor, apiError } from "@/lib/request-user";
import { RETENTION_POLICY } from "@/lib/operations-policy";

export const dynamic="force-dynamic";

export async function GET() {
  try {
    const actor=await requestActor();
    const db=getD1Binding();
    const now=new Date().toISOString();
    await db.batch([
      db.prepare("DELETE FROM notification_attempts WHERE user_id=? AND julianday(created_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.notificationAttemptsDays),
      db.prepare("DELETE FROM events WHERE user_id=? AND julianday(event_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.activityDays),
      db.prepare("DELETE FROM evaluations WHERE user_id=? AND julianday(created_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.activityDays),
      db.prepare("DELETE FROM sends WHERE user_id=? AND julianday(sent_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.activityDays),
      db.prepare("DELETE FROM source_reviews WHERE user_id=? AND julianday(discovered_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.activityDays),
      db.prepare("DELETE FROM operations_health_runs WHERE operator_user_id=? AND julianday(checked_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.operationsHealthDays),
      db.prepare("DELETE FROM operational_alerts WHERE operator_user_id=? AND status='resolved' AND julianday(resolved_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.operationsHealthDays),
      db.prepare("DELETE FROM followup_tasks WHERE user_id=? AND julianday(created_at) < julianday(?) - ?").bind(actor.userId,now,RETENTION_POLICY.followupDays),
    ]);
    return Response.json({
      role:actor.role,
      retention:RETENTION_POLICY,
    },{headers:{"Cache-Control":"no-store"}});
  } catch(error) { return apiError(error); }
}
