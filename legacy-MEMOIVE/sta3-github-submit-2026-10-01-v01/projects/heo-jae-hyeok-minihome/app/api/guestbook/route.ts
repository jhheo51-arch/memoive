import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin-auth';

type GuestbookRow = {
  id: number;
  nickname: string;
  message: string;
  createdAt: number;
};

const listEntriesSql = `
  SELECT id, nickname, message, created_at AS createdAt
  FROM guestbook_entries
  ORDER BY created_at DESC, id DESC
  LIMIT 100
`;

export async function GET() {
  try {
    const result = await env.DB.prepare(listEntriesSql).all<GuestbookRow>();

    return Response.json(
      { entries: result.results },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    console.error('Failed to load guestbook entries', error);
    return Response.json(
      { message: '방명록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 500 },
    );
  }
}

function problem(message: string, status: number) {
  return Response.json({ message }, { status });
}

async function mutate(request: Request, method: 'POST' | 'PATCH' | 'DELETE') {
  try {
    if (method !== 'POST' && !(await isAdmin(request))) {
      return problem('허재혁님만 접근이 가능합니다', 401);
    }
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return problem('올바른 형식의 방명록 내용을 보내 주세요.', 400);
    }
    const fields = body as Record<string, unknown>;
    const rawId = fields.id;
    const id = typeof rawId === 'number' ? rawId
      : typeof rawId === 'string' && /^\d+$/.test(rawId) ? Number(rawId) : NaN;
    if (method !== 'POST' && (!Number.isSafeInteger(id) || id < 1)) {
      return problem('수정하거나 삭제할 방명록 글을 확인해 주세요.', 400);
    }
    if (method === 'DELETE') {
      const deleted = await env.DB.prepare('DELETE FROM guestbook_entries WHERE id = ? RETURNING id')
        .bind(id).first<{ id: number }>();
      if (!deleted) return problem('해당 방명록 글을 찾지 못했습니다.', 404);
      return Response.json({ deletedId: deleted.id, message: '방명록 글이 삭제되었습니다.' });
    }
    const nickname = typeof fields.nickname === 'string' ? fields.nickname.trim() : '';
    const message = typeof fields.message === 'string' ? fields.message.trim() : '';

    if (!nickname || !message) {
      return problem('닉네임과 메시지를 모두 입력해 주세요.', 400);
    }

    if (nickname.length > 20 || message.length > 200) {
      return problem('닉네임은 20자, 메시지는 200자 이내로 입력해 주세요.', 400);
    }

    if (method === 'PATCH') {
      const entry = await env.DB.prepare(`
        UPDATE guestbook_entries SET nickname = ?, message = ? WHERE id = ?
        RETURNING id, nickname, message, created_at AS createdAt
      `).bind(nickname, message, id).first<GuestbookRow>();
      if (!entry) return problem('해당 방명록 글을 찾지 못했습니다.', 404);
      return Response.json({ entry });
    }

    const createdAt = Date.now();
    const entry = await env.DB.prepare(`
      INSERT INTO guestbook_entries (nickname, message, created_at)
      VALUES (?, ?, ?)
      RETURNING id, nickname, message, created_at AS createdAt
    `)
      .bind(nickname, message, createdAt)
      .first<GuestbookRow>();
    if (!entry) throw new Error('Insert returned no guestbook entry');
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    console.error(`Failed to ${method} guestbook entry`, error);
    return problem('방명록 변경을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
}

export async function POST(request: Request) {
  return mutate(request, 'POST');
}

export async function PATCH(request: Request) {
  return mutate(request, 'PATCH');
}

export async function DELETE(request: Request) {
  return mutate(request, 'DELETE');
}
