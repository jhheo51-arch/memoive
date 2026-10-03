import { getD1Binding } from "@/db";
import { requestUser, apiError } from "@/lib/request-user";

const allowedActions = new Set([
  "save",
  "execute",
  "more",
  "help",
  "adjust",
  "pause",
  "open_source",
  "paid_loop_interest",
  "preview_open",
  "preview_action",
]);

export async function POST(request: Request) {
  try {
    const userId = await requestUser();
    const payload = (await request.json()) as {
      eventType?: string;
      contentId?: string | null;
      detail?: string | null;
    };
    const eventType = payload.eventType?.trim() ?? "";
    if (!allowedActions.has(eventType))
      return Response.json(
        { error: "지원하지 않는 행동입니다." },
        { status: 400 },
      );
    const detail = payload.detail?.trim() ?? "";
    if (eventType === "help" && detail.length < 10)
      return Response.json(
        { error: "검토가 필요한 점을 10자 이상 적어 주세요." },
        { status: 400 },
      );
    if (detail.length > 1000)
      return Response.json(
        { error: "검토 내용은 1,000자 이내로 적어 주세요." },
        { status: 400 },
      );

    const binding = getD1Binding();
    const now = new Date();
    const queries = [
      binding
        .prepare(
          "INSERT INTO events (user_id, send_id, content_id, event_type, event_at) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          userId,
          null,
          payload.contentId ?? null,
          eventType,
          now.toISOString(),
        ),
    ];
    let task = null as null | {
      taskId: string;
      requestType: string;
      dueAt: string;
    };
    const followupHours =
      eventType === "execute" ? 72 : eventType === "help" ? 48 : null;
    if (followupHours) {
      const dueAt = new Date(
        now.getTime() + followupHours * 60 * 60 * 1000,
      ).toISOString();
      const taskId = `task-${crypto.randomUUID()}`;
      task = { taskId, requestType: eventType, dueAt };
      queries.push(
        binding
          .prepare(
            "INSERT INTO followup_tasks (task_id, user_id, request_type, due_at, owner, request_detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            taskId,
            userId,
            eventType,
            dueAt,
            "아하루프 운영팀",
            detail || null,
            "open",
            now.toISOString(),
          ),
      );
    }
    if (eventType === "pause") {
      queries.push(
        binding
          .prepare(
            "UPDATE user_profiles SET status = ?, updated_at = ? WHERE user_id = ?",
          )
          .bind("paused", now.toISOString(), userId),
      );
    }
    await binding.batch(queries);
    return Response.json(
      {
        ok: true,
        eventType,
        task,
        extraNewsCount: eventType === "more" ? 1 : 0,
        sponsoredSlot: eventType === "more" ? 1 : 0,
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
