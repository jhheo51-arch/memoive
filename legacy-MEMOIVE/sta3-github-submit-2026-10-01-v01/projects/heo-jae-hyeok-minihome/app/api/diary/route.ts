import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin-auth';

type DiaryRow = { id: number; title: string; content: string; imageKey: string | null; createdAt: number };
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const listEntriesSql = `
  SELECT id, title, content, image_key AS imageKey, created_at AS createdAt
  FROM diary_entries
  ORDER BY created_at DESC, id DESC
  LIMIT 50
`;

export async function GET() {
  try {
    const result = await env.DB.prepare(listEntriesSql).all<DiaryRow>();
    return Response.json({ entries: result.results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Failed to load diary entries', error);
    return Response.json({ message: '다이어리를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ message: '허재혁님만 접근이 가능합니다' }, { status: 401 });
  let uploadedKey: string | null = null;
  try {
    const formData = await request.formData();
    const rawTitle = formData.get('title');
    const rawContent = formData.get('content');
    const rawImage = formData.get('image');
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';
    if (!title || !content) return Response.json({ message: '제목과 내용을 모두 입력해 주세요.' }, { status: 400 });
    if (title.length > 20 || content.length > 200) return Response.json({ message: '제목은 20자, 내용은 200자 이내로 입력해 주세요.' }, { status: 400 });

    let imageType: string | null = null;
    if (rawImage instanceof File && rawImage.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(rawImage.type)) return Response.json({ message: '사진은 JPG, PNG, WEBP 형식만 첨부할 수 있습니다.' }, { status: 400 });
      if (rawImage.size > MAX_IMAGE_BYTES) return Response.json({ message: '사진은 5MB 이하로 첨부해 주세요.' }, { status: 400 });
      const extension = rawImage.type === 'image/png' ? 'png' : rawImage.type === 'image/webp' ? 'webp' : 'jpg';
      uploadedKey = `diary/${crypto.randomUUID()}.${extension}`;
      imageType = rawImage.type;
      await env.UPLOADS.put(uploadedKey, rawImage.stream(), { httpMetadata: { contentType: rawImage.type } });
    }

    const createdAt = Date.now();
    const entry = await env.DB.prepare(`
      INSERT INTO diary_entries (title, content, image_key, image_type, created_at)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, title, content, image_key AS imageKey, created_at AS createdAt
    `).bind(title, content, uploadedKey, imageType, createdAt).first<DiaryRow>();
    return Response.json({ entry }, { status: 201 });
  } catch (error) {
    if (uploadedKey) await env.UPLOADS.delete(uploadedKey).catch(() => undefined);
    console.error('Failed to create diary entry', error);
    return Response.json({ message: '일기를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ message: '허재혁님만 접근이 가능합니다' }, { status: 401 });
  let uploadedKey: string | null = null;
  try {
    const formData = await request.formData();
    const id = Number(formData.get('id'));
    const rawTitle = formData.get('title');
    const rawContent = formData.get('content');
    const title = typeof rawTitle === 'string' ? rawTitle.trim() : '';
    const content = typeof rawContent === 'string' ? rawContent.trim() : '';
    const rawImage = formData.get('image');
    if (!Number.isInteger(id) || id < 1 || !title || !content) return Response.json({ message: '수정할 일기와 내용을 확인해 주세요.' }, { status: 400 });
    if (title.length > 20 || content.length > 200) return Response.json({ message: '제목은 20자, 내용은 200자 이내로 입력해 주세요.' }, { status: 400 });
    const current = await env.DB.prepare(`SELECT image_key AS imageKey FROM diary_entries WHERE id = ?`).bind(id).first<{ imageKey: string | null }>();
    if (!current) return Response.json({ message: '해당 일기를 찾지 못했습니다.' }, { status: 404 });
    let imageKey = current.imageKey;
    let imageType: string | null = null;
    if (rawImage instanceof File && rawImage.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(rawImage.type)) return Response.json({ message: '사진은 JPG, PNG, WEBP 형식만 첨부할 수 있습니다.' }, { status: 400 });
      if (rawImage.size > MAX_IMAGE_BYTES) return Response.json({ message: '사진은 5MB 이하로 첨부해 주세요.' }, { status: 400 });
      const extension = rawImage.type === 'image/png' ? 'png' : rawImage.type === 'image/webp' ? 'webp' : 'jpg';
      uploadedKey = `diary/${crypto.randomUUID()}.${extension}`;
      imageType = rawImage.type;
      await env.UPLOADS.put(uploadedKey, rawImage.stream(), { httpMetadata: { contentType: rawImage.type } });
      imageKey = uploadedKey;
    }
    const entry = await env.DB.prepare(`
      UPDATE diary_entries SET title = ?, content = ?, image_key = ?, image_type = COALESCE(?, image_type) WHERE id = ?
      RETURNING id, title, content, image_key AS imageKey, created_at AS createdAt
    `).bind(title, content, imageKey, imageType, id).first<DiaryRow>();
    if (uploadedKey && current.imageKey) await env.UPLOADS.delete(current.imageKey).catch(() => undefined);
    return Response.json({ entry });
  } catch (error) {
    if (uploadedKey) await env.UPLOADS.delete(uploadedKey).catch(() => undefined);
    console.error('Failed to update diary entry', error);
    return Response.json({ message: '일기를 수정하지 못했습니다.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ message: '허재혁님만 접근이 가능합니다' }, { status: 401 });
  try {
    const body = (await request.json()) as { id?: unknown };
    const id = typeof body.id === 'number' ? body.id : Number(body.id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ message: '삭제할 일기를 확인해 주세요.' }, { status: 400 });
    const deleted = await env.DB.prepare(`DELETE FROM diary_entries WHERE id = ? RETURNING id, image_key AS imageKey`).bind(id).first<{ id: number; imageKey: string | null }>();
    if (!deleted) return Response.json({ message: '해당 일기를 찾지 못했습니다.' }, { status: 404 });
    if (deleted.imageKey) await env.UPLOADS.delete(deleted.imageKey).catch((error) => console.error('Failed to delete diary image', error));
    return Response.json({ deletedId: deleted.id, message: '일기가 삭제되었습니다.' });
  } catch (error) {
    console.error('Failed to delete diary entry', error);
    return Response.json({ message: '일기를 삭제하지 못했습니다.' }, { status: 500 });
  }
}
