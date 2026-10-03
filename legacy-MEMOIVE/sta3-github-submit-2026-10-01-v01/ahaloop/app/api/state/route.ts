import { getD1Binding } from "@/db";
import { requestUser } from "@/lib/request-user";

export const dynamic = "force-dynamic";

const demoProfile = {
  userId: "demo-user",
  name: "민서",
  interestTopics: ["스타트업", "고객 경험"],
  interestRoles: ["사업개발", "전략"],
  contentTypes: ["행사·공모전", "참고 자료", "채용·기회"],
  preferredChannel: "kakao",
  restartConsent: true,
  status: "active",
};

export async function GET() {
  try {
    const userId = await requestUser();
    const binding = getD1Binding();
    const [profileResult, eventResult, taskResult, evaluationResult] =
      await binding.batch([
        binding
          .prepare("SELECT * FROM user_profiles WHERE user_id = ? LIMIT 1")
          .bind(userId),
        binding
          .prepare(
            "SELECT event_type, content_id, event_at FROM events WHERE user_id = ? ORDER BY event_at DESC LIMIT 30",
          )
          .bind(userId),
        binding.prepare(
          "SELECT task_id, request_type, due_at, owner, request_detail, status FROM followup_tasks WHERE user_id = ? ORDER BY due_at ASC LIMIT 20",
        ).bind(userId),
        binding.prepare(
          "SELECT relevance, amount, action_intent, receive_next, created_at FROM evaluations WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        ),
      ]);
    const rawProfile = profileResult.results?.[0] as
      Record<string, unknown> | undefined;
    const profile = rawProfile
      ? {
          userId: rawProfile.user_id,
          name: rawProfile.name,
          interestTopics: JSON.parse(String(rawProfile.interest_topics)),
          interestRoles: JSON.parse(String(rawProfile.interest_roles)),
          contentTypes: JSON.parse(String(rawProfile.content_types)),
          preferredChannel: rawProfile.preferred_channel,
          restartConsent: Boolean(rawProfile.restart_consent),
          status: rawProfile.status,
        }
      : { ...demoProfile, userId, name: "회원", interestTopics: [], interestRoles: [], contentTypes: [], restartConsent: false, status: "unconfigured" };
    const events = eventResult.results ?? [];
    const tasks = taskResult.results ?? [];
    const evaluations = evaluationResult.results ?? [];
    return Response.json({ profile, events, tasks, evaluations });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "상태를 불러오지 못했습니다.",
      },
      { status: 503 },
    );
  }
}
