const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...extraHeaders } });
}

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : '';
}

function cors(origin) {
  return origin ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  } : {};
}

function cleanText(value, limit = 4000) {
  return typeof value === 'string' ? value.trim().slice(0, limit) : '';
}

function cleanPayload(input) {
  const records = Array.isArray(input.records) ? input.records.slice(0, 8).map(record => ({
    title: cleanText(record?.title, 160),
    source: cleanText(record?.source, 200),
    url: cleanText(record?.url, 500),
    summary: cleanText(record?.summary, 1600),
    points: Array.isArray(record?.points) ? record.points.slice(0, 6).map(value => cleanText(value, 500)) : [],
    thought: cleanText(record?.thought, 1000),
    uncertainty: cleanText(record?.uncertainty, 800)
  })).filter(record => record.title && record.summary) : [];
  return {
    type: cleanText(input.type, 40),
    tone: cleanText(input.tone, 40),
    purpose: cleanText(input.purpose, 600),
    viewpoint: cleanText(input.viewpoint, 1200),
    records,
    draft: input.draft ? { title: cleanText(input.draft.title, 160), body: cleanText(input.draft.body, 7000) } : null
  };
}

function promptFor(data) {
  const channel = {
    social_post: '인스타그램 게시물: 140~900자, 첫 문장은 짧고 선명하게, 해시태그는 최대 3개',
    social_story: '인스타그램 스토리: 60~420자, 한 화면에서 읽히는 짧은 문장',
    article: '블로그·뉴스레터: 350~3500자, 소제목과 자연스러운 흐름',
    proposal: '업무 제안서: 220~3000자, 문제·제안·첫 실행·확인 지표',
    project: '프로젝트 기획안: 220~3000자, 배경·목표·가설·첫 버전·검증',
    idea: '아이디어 메모: 120~1800자, 발견·관점·다음 행동'
  }[data.type] || '읽기 쉬운 개인 기록';
  const tone = { insight: '차분한 인사이트', friendly: '친근한 경험담', clear: '또렷한 제안' }[data.tone] || '차분한 인사이트';
  return [
    '당신은 개인 창작 시스템 MEMOIVE의 편집 조력자입니다.',
    '사용자를 심사하지 말고, 사용자가 제공한 관점과 기록을 보존하면서 공유 가능한 초안을 제안하세요.',
    `채널: ${channel}`,
    `말투: ${tone}`,
    `전달 목적: ${data.purpose || '기록을 결과물로 발전시키기'}`,
    `사용자의 관점: ${data.viewpoint}`,
    '반드시 지킬 규칙:',
    '1. 기록에 없는 사실, 수치, 인용을 만들지 않습니다.',
    '2. 출처에서 확인한 내용과 사용자의 의견을 분명히 나눕니다.',
    '3. 문장 중복과 어색한 연결을 제거합니다.',
    '4. 첫 문장과 제목은 구체적이되 과장하지 않습니다.',
    '5. 사용자가 이미 쓴 초안이 있으면 의미와 말투를 최대한 보존해 다듬습니다.',
    '6. 불확실한 내용은 확정적으로 쓰지 않습니다.',
    data.draft ? `사용자가 쓴 초안:\n${JSON.stringify(data.draft)}` : '',
    `참고 기록:\n${JSON.stringify(data.records)}`,
    'JSON 형식의 title과 body만 반환하세요.'
  ].filter(Boolean).join('\n\n');
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/health') return json({ ok: true, model: env.GEMINI_MODEL || 'gemini-3.5-flash-lite' });
    const origin = allowedOrigin(request, env);
    if (request.method === 'OPTIONS') return origin ? new Response(null, { status: 204, headers: cors(origin) }) : json({ message: '허용되지 않은 사이트예요.' }, 403);
    if (url.pathname !== '/v1/refine' || request.method !== 'POST') return json({ message: '요청 경로를 확인해 주세요.' }, 404, cors(origin));
    if (!origin) return json({ message: '허용되지 않은 사이트예요.' }, 403);
    if (!env.GEMINI_API_KEY) return json({ message: 'Gemini 연결 설정이 필요해요.' }, 503, cors(origin));
    if (Number(request.headers.get('Content-Length') || 0) > 100000) return json({ message: '한 번에 보낼 수 있는 기록 분량을 넘었어요.' }, 413, cors(origin));

    let input;
    try { input = cleanPayload(await request.json()); } catch { return json({ message: '요청 내용을 읽지 못했어요.' }, 400, cors(origin)); }
    if (!input.records.length || !input.viewpoint) return json({ message: '영감 기록과 나의 관점이 필요해요.' }, 400, cors(origin));

    const model = env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptFor(input) }] }],
        generationConfig: {
          temperature: 0.65,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: { title: { type: 'STRING' }, body: { type: 'STRING' } },
            required: ['title', 'body']
          }
        }
      })
    });
    const result = await geminiResponse.json().catch(() => ({}));
    if (!geminiResponse.ok) {
      const status = geminiResponse.status === 429 ? 429 : 502;
      return json({ message: status === 429 ? '무료 사용 한도에 잠시 도달했어요.' : 'Gemini 응답을 받지 못했어요.' }, status, cors(origin));
    }
    try {
      const raw = result.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('') || '';
      const output = JSON.parse(raw);
      const title = cleanText(output.title, 160), body = cleanText(output.body, 7000);
      if (!title || !body) throw new Error('empty');
      return json({ title, body, model, usage: result.usageMetadata || null }, 200, cors(origin));
    } catch {
      return json({ message: 'Gemini가 완성된 글을 보내지 않았어요.' }, 502, cors(origin));
    }
  }
};
