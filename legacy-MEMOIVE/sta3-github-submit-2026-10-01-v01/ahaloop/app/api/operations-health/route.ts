import {getD1Binding} from "@/db";
import {evaluateOperationsHealth,type OperationsSnapshot} from "@/lib/operations-health";
import {requireOperator,apiError} from "@/lib/request-user";

export const dynamic="force-dynamic";

type SourceRow={benefit_id:string;status:string;discovered_at:string};
type NotificationRow={channel:string;status:string;created_at:string;updated_at:string};

async function readSnapshot(operatorUserId:string):Promise<OperationsSnapshot>{
  const db=getD1Binding();
  const [sources,notifications,pass,receipts,followups]=await db.batch([
    db.prepare(`SELECT source.benefit_id,source.status,source.discovered_at FROM source_reviews source
      INNER JOIN (SELECT benefit_id,MAX(discovered_at) latest_at FROM source_reviews WHERE user_id=? GROUP BY benefit_id) latest
      ON latest.benefit_id=source.benefit_id AND latest.latest_at=source.discovered_at
      WHERE source.user_id=?`).bind(operatorUserId,operatorUserId),
    db.prepare("SELECT channel,status,created_at,updated_at FROM notification_attempts WHERE user_id=? AND julianday(created_at)>=julianday('now')-30 ORDER BY created_at DESC LIMIT 100").bind(operatorUserId),
    db.prepare(`SELECT
      COUNT(DISTINCT CASE WHEN event_type='pass_session_started' THEN json_extract(properties,'$.sessionId') END) sessions,
      COUNT(DISTINCT CASE WHEN event_type='pass_first_benefit_viewed' THEN json_extract(properties,'$.sessionId') END) first_benefit_views,
      ROUND(AVG(CASE WHEN event_type='pass_first_benefit_viewed' THEN CAST(json_extract(properties,'$.choiceCount') AS REAL) END),1) avg_choices
      FROM events WHERE user_id=? AND event_type LIKE 'pass_%'`).bind(operatorUserId),
    db.prepare("SELECT COUNT(*) count FROM benefit_applications WHERE user_id=? AND stage='received' AND (received_at IS NULL OR receipt_method IS NULL)").bind(operatorUserId),
    db.prepare("SELECT COUNT(*) count FROM followup_tasks WHERE user_id=? AND status='open' AND julianday(due_at)<julianday('now')").bind(operatorUserId),
  ]);
  const passRow=(pass.results?.[0]??{}) as Record<string,unknown>;
  return {
    sourceChecks:(sources.results as SourceRow[]).map(row=>({benefitId:row.benefit_id,status:row.status,discoveredAt:row.discovered_at})),
    notificationAttempts:(notifications.results as NotificationRow[]).map(row=>({channel:row.channel,status:row.status,createdAt:row.created_at,updatedAt:row.updated_at})),
    pass:{sessions:Number(passRow.sessions??0),firstBenefitViews:Number(passRow.first_benefit_views??0),avgChoices:passRow.avg_choices===null||passRow.avg_choices===undefined?null:Number(passRow.avg_choices)},
    receiptAnomalies:Number((receipts.results?.[0] as {count?:number}|undefined)?.count??0),
    overdueFollowups:Number((followups.results?.[0] as {count?:number}|undefined)?.count??0),
  };
}

async function runMonitor(operatorUserId:string){
  const db=getD1Binding();const checkedAt=new Date().toISOString();
  const result=evaluateOperationsHealth(await readSnapshot(operatorUserId),Date.parse(checkedAt));
  const statements=result.alerts.map(alert=>db.prepare(`INSERT INTO operational_alerts
    (id,operator_user_id,alert_key,category,severity,title,detail,status,first_detected_at,last_detected_at,resolved_at)
    VALUES (?,?,?,?,?,?,?,'open',?,?,NULL)
    ON CONFLICT(operator_user_id,alert_key) DO UPDATE SET category=excluded.category,severity=excluded.severity,title=excluded.title,detail=excluded.detail,status='open',last_detected_at=excluded.last_detected_at,resolved_at=NULL`)
    .bind(crypto.randomUUID(),operatorUserId,alert.key,alert.category,alert.severity,alert.title,alert.detail,checkedAt,checkedAt));
  const keys=result.alerts.map(alert=>alert.key);
  statements.push(keys.length
    ?db.prepare(`UPDATE operational_alerts SET status='resolved',resolved_at=? WHERE operator_user_id=? AND status='open' AND alert_key NOT IN (${keys.map(()=>"?").join(",")})`).bind(checkedAt,operatorUserId,...keys)
    :db.prepare("UPDATE operational_alerts SET status='resolved',resolved_at=? WHERE operator_user_id=? AND status='open'").bind(checkedAt,operatorUserId));
  statements.push(db.prepare(`INSERT INTO operations_health_runs
    (id,operator_user_id,overall_status,alert_count,source_failure_count,notification_failure_count,data_anomaly_count,checked_at)
    VALUES (?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(),operatorUserId,result.status,result.alerts.length,result.metrics.sourceFailures,result.metrics.notificationFailures,result.metrics.dataAnomalies,checkedAt));
  await db.batch(statements);
  const [alerts,runs]=await db.batch([
    db.prepare("SELECT alert_key,category,severity,title,detail,status,first_detected_at,last_detected_at FROM operational_alerts WHERE operator_user_id=? AND status='open' ORDER BY CASE severity WHEN 'critical' THEN 0 ELSE 1 END,last_detected_at DESC").bind(operatorUserId),
    db.prepare("SELECT overall_status,alert_count,source_failure_count,notification_failure_count,data_anomaly_count,checked_at FROM operations_health_runs WHERE operator_user_id=? ORDER BY checked_at DESC LIMIT 12").bind(operatorUserId),
  ]);
  return {status:result.status,checkedAt,metrics:result.metrics,alerts:alerts.results,runs:runs.results,scope:"운영자 계정 집계 · 개인정보·원문 내용 제외"};
}

export async function GET(){
  try{return Response.json(await runMonitor(await requireOperator()),{headers:{"Cache-Control":"no-store"}});}catch(error){return apiError(error);}
}
