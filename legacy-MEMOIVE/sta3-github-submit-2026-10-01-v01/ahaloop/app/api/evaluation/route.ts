import { getD1Binding } from "@/db";
import { requestUser } from "@/lib/request-user";

export async function POST(request: Request) {
  try {
    const userId = await requestUser();
    const payload = await request.json() as { relevance?: string; amount?: string; actionIntent?: boolean; improvement?: string; receiveNext?: string };
    if (!payload.relevance || !payload.amount) return Response.json({ error: "필수 평가 항목을 선택해 주세요." }, { status: 400 });
    const binding = getD1Binding();
    await binding.prepare("INSERT INTO evaluations (user_id, send_id, relevance, amount, action_intent, improvement, receive_next, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(userId, null, payload.relevance, payload.amount, payload.actionIntent ? 1 : 0, payload.improvement ?? null, "add_one_news", new Date().toISOString()).run();
    return Response.json({ ok: true, nextWeekNewsBonus: 1 }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "평가를 저장하지 못했습니다." }, { status: 500 });
  }
}
