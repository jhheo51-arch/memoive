import { getD1Binding } from "@/db";
import { PASS_EVENT_TYPES } from "@/lib/ahaloop-pass";
import { apiError, requestUser } from "@/lib/request-user";
import { z } from "zod";

const schema = z.object({
  eventType: z.enum(PASS_EVENT_TYPES),
  sessionId: z.string().uuid(),
  benefitId: z.string().max(100).optional(),
  step: z.enum(["region", "age", "employmentStatus"]).optional(),
  choiceCount: z.number().int().min(0).max(3).optional(),
  elapsedMs: z.number().int().min(0).max(3_600_000).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requestUser();
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success)
      return Response.json({ error: "아하루프 패스 측정값을 확인해 주세요." }, { status: 400 });

    const event = parsed.data;
    const db = getD1Binding();
    const properties = JSON.stringify({
      sessionId: event.sessionId,
      step: event.step,
      choiceCount: event.choiceCount,
      elapsedMs: event.elapsedMs,
    });
    const oncePerSession = event.eventType === "pass_session_started" || event.eventType === "pass_first_benefit_viewed";
    const result = oncePerSession
      ? await db.prepare(`INSERT INTO events (user_id,content_id,event_type,event_at,properties)
          SELECT ?,?,?,?,? WHERE NOT EXISTS (
            SELECT 1 FROM events WHERE user_id=? AND event_type=?
              AND json_extract(properties,'$.sessionId')=?
          )`)
          .bind(userId, event.benefitId ?? null, event.eventType, new Date().toISOString(), properties, userId, event.eventType, event.sessionId)
          .run()
      : await db.prepare("INSERT INTO events (user_id,content_id,event_type,event_at,properties) VALUES (?,?,?,?,?)")
          .bind(userId, event.benefitId ?? null, event.eventType, new Date().toISOString(), properties)
          .run();

    return Response.json({ ok: true, recorded: Boolean(result.meta.changes) }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
