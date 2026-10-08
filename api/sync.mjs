import { authorized } from './_owner-auth.mjs';
import { supabaseAdmin } from './_supabase.mjs';
import { corsHeaders, preflight } from './_cors.mjs';

const OWNER_ID = 'owner';
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

export function versionFromEtag(value = '') {
  const match = String(value).match(/^v([1-9]\d*)$/);
  const version = match ? Number(match[1]) : 0;
  return Number.isSafeInteger(version) && version < Number.MAX_SAFE_INTEGER ? version : 0;
}

export { authorized };

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

async function readCloudState(client) {
  const { data, error } = await client.from('memoive_owner_state').select('payload,version,updated_at').eq('id', OWNER_ID).maybeSingle();
  if (error) throw error;
  return data ? { data: validateSyncState(data.payload), version: Number(data.version) || 1, updatedAt: data.updated_at } : null;
}

export function createSyncHandler({ createClient = supabaseAdmin } = {}) { return {
  async fetch(request) {
    const cors = corsHeaders(request);
    const options = preflight(request);
    if (options) return options;
    if (request.headers.get('Origin') && !Object.keys(cors).length) return json({ message: '허용되지 않은 서비스 주소예요.' }, 403);
    if (!await authorized(request)) return json({ message: '소유자 연결 코드를 확인해 주세요.' }, 401, cors);
    let client;
    try { client = createClient(); }
    catch (error) { return json({ message: error.message }, 503, cors); }

    if (request.method === 'GET') {
      try {
        const stored = await readCloudState(client);
        return stored
          ? json({ ...stored.data, syncEtag: `v${stored.version}`, syncedAt: stored.updatedAt }, 200, cors)
          : json({ message: '아직 Supabase에 저장된 기록이 없어요.' }, 404, cors);
      } catch (error) {
        return json({ message: error.message || 'Supabase 기록을 읽지 못했어요.' }, 500, cors);
      }
    }
    if (request.method !== 'PUT') return json({ message: 'GET 또는 PUT 요청만 사용할 수 있어요.' }, 405, { ...cors, Allow: 'GET, PUT, OPTIONS' });
    if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ message: 'JSON 형식만 저장할 수 있어요.' }, 415, cors);

    try {
      const payload = await readBody(request);
      const ifMatch = request.headers.get('If-Match');
      const currentVersion = versionFromEtag(ifMatch);
      if (ifMatch !== null && !currentVersion) return json({ message: '저장 버전이 올바르지 않아요. 최신 기록을 다시 불러와 주세요.' }, 400, cors);
      let row;
      if (currentVersion) {
        const { data, error } = await client
          .from('memoive_owner_state')
          .update({ payload, version: currentVersion + 1, updated_at: new Date().toISOString() })
          .eq('id', OWNER_ID)
          .eq('version', currentVersion)
          .select('version,updated_at')
          .maybeSingle();
        if (error) throw error;
        if (!data) return json({ message: '다른 화면에서 기록이 먼저 바뀌었어요. 최신 기록을 다시 불러와 주세요.' }, 412, cors);
        row = data;
      } else {
        const { data, error } = await client
          .from('memoive_owner_state')
          .insert({ id: OWNER_ID, payload, version: 1, updated_at: new Date().toISOString() })
          .select('version,updated_at')
          .single();
        if (error?.code === '23505') return json({ message: '이미 저장된 기록이 있어요. 최신 기록을 다시 불러온 뒤 저장해 주세요.' }, 412, cors);
        if (error) throw error;
        row = data;
      }
      return json({ ok: true, syncEtag: `v${row.version}`, records: payload.records.length, outputs: payload.outputs.length, updatedAt: row.updated_at }, 200, cors);
    } catch (error) {
      return json({ message: error.message || 'Supabase에 기록을 저장하지 못했어요.' }, 400, cors);
    }
  }
}; }

export default createSyncHandler();
