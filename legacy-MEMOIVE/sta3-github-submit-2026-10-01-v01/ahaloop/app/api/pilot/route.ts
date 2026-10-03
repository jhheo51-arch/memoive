import { getD1Binding } from "@/db";
import { requireOperator, apiError } from "@/lib/request-user";
import { PILOT_CONSENT_STATUSES, PILOT_PARTICIPANT_CODES, PILOT_STATUSES } from "@/lib/operations-policy";
import { z } from "zod";

export const dynamic="force-dynamic";
const payloadSchema=z.object({
  participantCode:z.enum(PILOT_PARTICIPANT_CODES),
  status:z.enum(PILOT_STATUSES),
  consentStatus:z.enum(PILOT_CONSENT_STATUSES),
  choicesToFirstBenefit:z.number().int().min(1).max(20).nullable(),
  firstBenefitElapsedSeconds:z.number().int().min(1).max(3600).nullable(),
  firstBenefitId:z.string().max(120).nullable(),
  preparationStarted:z.boolean(),
  stopPoint:z.string().trim().max(300),
  observation:z.string().trim().max(2000),
}).strict();

export async function GET() {
  try {
    const operator=await requireOperator();
    const rows=await getD1Binding().prepare("SELECT * FROM pilot_sessions WHERE operator_user_id=? ORDER BY participant_code").bind(operator).all();
    return Response.json({
      cohort:"서울 거주 만 19~34세 직장인·구직자 · 최근 6개월 정책·지원금 탐색 경험",
      target:5,
      participants:rows.results,
      privacy:"익명 코드만 저장하며 실명·연락처·민감서류는 받지 않습니다.",
    },{headers:{"Cache-Control":"no-store"}});
  } catch(error) { return apiError(error); }
}

export async function POST(request:Request) {
  try {
    const operator=await requireOperator();
    const parsed=payloadSchema.safeParse(await request.json());
    if(!parsed.success)return Response.json({error:"참가 상태와 관찰 값을 확인해 주세요."},{status:400});
    const value=parsed.data;
    if(value.status!=="planned"&&value.consentStatus!=="agreed"&&value.status!=="withdrawn")return Response.json({error:"참여 동의가 확인된 뒤에만 관찰 상태를 기록할 수 있습니다."},{status:400});
    const now=new Date().toISOString();
    const db=getD1Binding();
    await db.prepare(`INSERT INTO pilot_sessions (
      id,operator_user_id,participant_code,status,consent_status,choices_to_first_benefit,
      first_benefit_elapsed_ms,first_benefit_id,preparation_started,stop_point,observation,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(operator_user_id,participant_code) DO UPDATE SET
      status=excluded.status,consent_status=excluded.consent_status,
      choices_to_first_benefit=excluded.choices_to_first_benefit,
      first_benefit_elapsed_ms=excluded.first_benefit_elapsed_ms,
      first_benefit_id=excluded.first_benefit_id,preparation_started=excluded.preparation_started,
      stop_point=excluded.stop_point,observation=excluded.observation,updated_at=excluded.updated_at`)
      .bind(crypto.randomUUID(),operator,value.participantCode,value.status,value.consentStatus,value.choicesToFirstBenefit,value.firstBenefitElapsedSeconds===null?null:value.firstBenefitElapsedSeconds*1000,value.firstBenefitId,value.preparationStarted,value.stopPoint||null,value.observation||null,now,now).run();
    return Response.json({ok:true,message:`${value.participantCode} 파일럿 기록을 저장했습니다.`});
  } catch(error) { return apiError(error); }
}
