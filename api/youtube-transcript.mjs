const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const TRANSCRIPT_ORIGIN = 'https://youtube-transcript.ai';

function response(body, status, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

export async function readTranscript(request, fetcher = fetch) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') || '';
  if (!VIDEO_ID.test(id)) return response('유효한 유튜브 영상 주소가 아니에요.', 400);

  try {
    const upstream = await fetcher(`${TRANSCRIPT_ORIGIN}/transcript/${id}.txt`, {
      headers: {Accept: 'text/markdown'},
      signal: AbortSignal.timeout(20000)
    });
    if (!upstream.ok) return response('공개 스크립트를 가져오지 못했어요.', 502);
    const body = await upstream.text();
    if (!body.startsWith('# Transcript:') || !body.includes('## Transcript') || !body.includes(id)) {
      return response('확인할 수 있는 공개 스크립트가 없어요.', 502);
    }
    return response(body, 200, {'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800'});
  } catch {
    return response('스크립트 확인 시간이 초과됐어요.', 504);
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') return response('GET 요청만 사용할 수 있어요.', 405, {Allow:'GET'});
    return readTranscript(request);
  }
};
