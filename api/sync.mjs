import { BlobPreconditionFailedError, get, head, put } from '@vercel/blob';

const PATHNAME = 'memoive/owner-state.json';
const MAX_BYTES = 2 * 1024 * 1024;
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff'
};

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}

function cleanText(value, limit = 500) {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

export function validateSyncState(input) {
  if (!input || typeof input !== 'object') throw new Error('동기화할 기록을 읽지 못했어요.');
  if (!Array.isArray(input.records) || !Array.isArray(input.outputs)) throw new Error('기록 또는 결과물 형식이 올바르지 않아요.');
  if (input.records.length > 5000 || input.outputs.length > 2000) throw new Error('한 번에 동기화할 수 있는 기록 수를 넘었어요.');
  const recordIds = new Set();
  for (const record of input.records) {
    if (!record || typeof record !== 'object' || !cleanText(record.id, 200) || !cleanText(record.title, 500) || !Array.isArray(record.topics)) throw new Error('올바르지 않은 기록이 포함돼 있어요.');
    if (recordIds.has(record.id)) throw new Error('같은 ID의 기록이 중복돼 있어요.');
    recordIds.add(record.id);
  }
  const outputIds = new Set();
  for (const output of input.outputs) {
    if (!output || typeof output !== 'object' || !cleanText(output.id, 200) || !cleanText(output.title, 500)) throw new Error('올바르지 않은 결과물이 포함돼 있어요.');
    if (outputIds.has(output.id)) throw new Error('같은 ID의 결과물이 중복돼 있어요.');
    outputIds.add(output.id);
  }
  return input;
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return mismatch === 0;
}

export async function authorized(request, expectedHash = process.env.MEMOIVE_SYNC_SECRET_SHA256 || '') {
  const header = request.headers.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token || token.length > 300 || !expectedHash) return false;
  return constantTimeEqual(await sha256(token), expectedHash.toLowerCase());
}

async function readBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('동기화할 내용이 없어요.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      throw new Error('동기화 데이터가 2MB를 넘었어요.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return validateSyncState(JSON.parse(new TextDecoder().decode(bytes)));
}

async function readCloudState() {
  const result = await get(PATHNAME, { access: 'private', useCache: false });
  if (!result || result.statusCode === 404) return null;
  if (result.statusCode !== 200 || !result.stream) throw new Error('클라우드 기록을 읽지 못했어요.');
  const data = JSON.parse(await new Response(result.stream).text());
  // A private Blob download may expose a weak CDN ETag (W/"...").
  // Conditional writes require the strong store ETag returned by head().
  const metadata = await head(PATHNAME);
  return { data: validateSyncState(data), etag: metadata.etag || '' };
}

export default {
  async fetch(request) {
    if (!await authorized(request)) return json({ message: '소유자 연결 코드를 확인해 주세요.' }, 401);
    if (request.method === 'GET') {
      try {
        const stored = await readCloudState();
        return stored ? json({ ...stored.data, syncEtag: stored.etag }) : json({ message: '아직 클라우드 기록이 없어요.' }, 404);
      } catch (error) {
        return json({ message: error.message || '클라우드 기록을 읽지 못했어요.' }, 500);
      }
    }
    if (request.method !== 'PUT') return json({ message: 'GET 또는 PUT 요청만 사용할 수 있어요.' }, 405, { Allow: 'GET, PUT' });
    if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ message: 'JSON 형식만 저장할 수 있어요.' }, 415);
    try {
      const data = await readBody(request);
      const ifMatch = cleanText(request.headers.get('If-Match'), 200);
      const blob = await put(PATHNAME, JSON.stringify(data), {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        cacheControlMaxAge: 60,
        ...(ifMatch ? { ifMatch } : {})
      });
      return json({ ok: true, syncEtag: blob.etag, records: data.records.length, outputs: data.outputs.length, updatedAt: new Date().toISOString() });
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) return json({ message: '다른 화면에서 기록이 먼저 바뀌었어요. 최신 기록을 다시 불러와 주세요.' }, 412);
      return json({ message: error.message || '클라우드에 기록을 저장하지 못했어요.' }, 400);
    }
  }
};
