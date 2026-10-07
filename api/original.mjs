import { authorized } from './_owner-auth.mjs';
import { supabaseAdmin } from './_supabase.mjs';
import { corsHeaders, preflight } from './_cors.mjs';

const BUCKET = 'memoive-originals';
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', ...headers } });
}

export function objectPath(id) {
  if (!ID_PATTERN.test(id || '')) throw new Error('원본 기록 ID가 올바르지 않아요.');
  return `owner/${id}`;
}

export default {
  async fetch(request) {
    const cors = corsHeaders(request);
    const options = preflight(request);
    if (options) return options;
    if (request.headers.get('Origin') && !Object.keys(cors).length) return json({ message: '허용되지 않은 서비스 주소예요.' }, 403);
    if (!await authorized(request)) return json({ message: '소유자 연결 코드를 확인해 주세요.' }, 401, cors);
    let input = {};
    try { input = request.method === 'POST' ? await request.json() : {}; }
    catch { return json({ message: '요청 내용을 읽지 못했어요.' }, 400, cors); }

    let client, path;
    try { client = supabaseAdmin(); path = objectPath(input.id); }
    catch (error) { return json({ message: error.message }, 400, cors); }

    try {
      if (input.action === 'upload') {
        const allowed = /^image\/(png|jpeg|gif|webp|avif)$/.test(input.contentType || '') || /^audio\//.test(input.contentType || '');
        if (!allowed) return json({ message: '지원하는 이미지 또는 음성 형식이 아니에요.' }, 415, cors);
        const { data, error } = await client.storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
        if (error) throw error;
        return json({ signedUrl: data.signedUrl, path }, 200, cors);
      }
      if (input.action === 'download') {
        const { data, error } = await client.storage.from(BUCKET).createSignedUrl(path, 3600);
        if (error) throw error;
        return json({ signedUrl: data.signedUrl }, 200, cors);
      }
      if (input.action === 'delete') {
        const { error } = await client.storage.from(BUCKET).remove([path]);
        if (error) throw error;
        return json({ ok: true }, 200, cors);
      }
      return json({ message: '지원하지 않는 원본 작업이에요.' }, 400, cors);
    } catch (error) {
      const missing = /not found|Object not found/i.test(error.message || '');
      return json({ message: missing ? '클라우드에 저장된 원본이 없어요.' : (error.message || '원본 저장소를 사용할 수 없어요.') }, missing ? 404 : 500, cors);
    }
  }
};
