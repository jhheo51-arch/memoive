import { getD1Binding } from "@/db";
import { contentCatalog } from "@/lib/content-catalog";

const catalog = contentCatalog.map((item) => ({
  contentId: item.id,
  type: item.type,
  topics: item.topics,
  roles: item.roles,
  title: item.title,
  sourceUrl: item.sourceUrl,
  publishedAt: item.publishedAt,
  deadline: item.deadline ?? null,
}));

export async function GET() {
  try {
    const binding = getD1Binding();
    const result = await binding
      .prepare("SELECT content_id, approval_status, reviewed_at FROM contents")
      .all();
    const saved = new Map(
      (result.results ?? []).map((row) => [String(row.content_id), row]),
    );
    return Response.json({
      contents: catalog.map((item) => ({
        ...item,
        approvalStatus: saved.get(item.contentId)?.approval_status ?? "pending",
        reviewedAt: saved.get(item.contentId)?.reviewed_at ?? null,
      })),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "콘텐츠를 불러오지 못했습니다.",
      },
      { status: 503 },
    );
  }
}

export async function POST() { return Response.json({error:"레거시 뉴스 검수 쓰기는 중지됐습니다. 혜택 검증실을 이용해 주세요."},{status:410}); }
