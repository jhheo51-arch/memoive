import assert from 'node:assert/strict';
import worker from '../cloudflare-worker/src/index.js';
import { question, feedback, reflection, questionProblem, vagueAnswer, reflectionProblem } from '../cloudflare-worker/src/coach.mjs';
import { insight } from '../cloudflare-worker/src/insight.mjs';

const env = { AI_RECORDS_ENABLED: 'true', GEMINI_API_KEY: 'test-only', GEMINI_MODEL: 'test-model', AI_RATE_LIMITER: { limit: async () => ({ success: true }) } };
const post = (path, data) => new Request('https://worker.test' + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: typeof data === 'string' ? data : JSON.stringify(data) });
const perspective = { name: 'UX 리서처', prompts: ['무엇이 새로웠나', '내 일에 적용한다면'], base: '연구자' };
const ask = { title: '계좌 개설 이탈 사례', source: '은행 화면은 바꿀 수 없어 앱 안의 선택 흐름으로 작은 실험을 했다.', thought: '제약부터 적어야겠다.', perspective, turns: [] };
const draft = { title: '제약에서 시작하는 실험', body: '바꿀 수 없는 화면이 있다면 먼저 그 제약을 적고, 바꿀 수 있는 앱 안의 흐름에서 작은 실험을 설계하는 편이 낫다고 생각한다. 토스 사례가 그 예다.', purpose: '팀에 공유', viewpoint: '제약부터 적자', records: [{ title: '계좌 사일로', summary: '은행 화면 제약 속 작은 실험', thought: '제약부터 적어야겠다.' }] };

let sent, answer;
const original = globalThis.fetch;
globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answer) }] } }] })); };
try {
  // Guards shared with the existing AI routes.
  assert.equal((await question(post('/v1/question', ask), {})).status, 503);
  assert.equal((await question(post('/v1/question', ask), { ...env, AI_RATE_LIMITER: { limit: async () => ({ success: false }) } })).status, 429);
  assert.equal((await question(new Request('https://worker.test/v1/question', { method: 'POST', body: '{}' }), env)).status, 415);
  assert.equal((await question(post('/v1/question', 'x'.repeat(60001)), env)).status, 413);
  assert.equal((await question(post('/v1/question', '{broken'), env)).status, 400);

  // Question input validation with readable messages.
  const invalid = async (data, pattern) => { const r = await question(post('/v1/question', data), env); assert.equal(r.status, 400); assert.match((await r.json()).message, pattern); };
  await invalid({ ...ask, title: '' }, /제목/);
  await invalid({ ...ask, source: '가'.repeat(6001) }, /6,000자/);
  await invalid({ ...ask, perspective: { ...perspective, base: '해커' } }, /관점/);
  await invalid({ ...ask, perspective: { ...perspective, name: '가'.repeat(21) } }, /관점/);
  await invalid({ ...ask, perspective: { ...perspective, prompts: ['1', '2', '3', '4', '5'] } }, /관점/);
  await invalid({ ...ask, turns: [{ question: '첫 질문', answer: '' }] }, /답한 뒤/);
  await invalid({ ...ask, turns: [1, 2, 3].map(() => ({ question: '질문', answer: '답' })) }, /3개까지/);

  answer = { question: '  은행 화면처럼 바꿀 수 없는 제약이\n당신의 작업에서는 무엇인가요?  ' };
  let r = await question(post('/v1/question', { ...ask, turns: [{ question: '무엇이 새로웠나요?', answer: '제약을 먼저 적는 점' }] }), env);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).question, '은행 화면처럼 바꿀 수 없는 제약이 당신의 작업에서는 무엇인가요?');
  const prompt = JSON.parse(sent.contents[0].parts[0].text), system = sent.systemInstruction.parts[0].text;
  assert.deepEqual(prompt.perspective, perspective);
  assert.equal(prompt.turns[0].answer, '제약을 먼저 적는 점');
  assert.match(system, /신뢰할 수 없는 자료/);
  assert.match(system, /추정해 전제로 삼지 않는다/);
  assert.match(system, /답의 예시는 쓰지 않는다/);
  assert.match(system, /lastAnswerVague가 true이면/);
  assert.match(system, /앞서 세운 가설을/, 'presumptive phrasing is named as forbidden');
  assert.deepEqual(sent.generationConfig.responseJsonSchema.required, ['question']);
  answer = { question: '짧' };
  assert.equal((await question(post('/v1/question', ask), env)).status, 502, 'too-short questions are rejected');

  // Questions must not assume plans or work the person never mentioned; one retry, then fail.
  const replies = [];
  const sentSystems = [];
  globalThis.fetch = async (_url, options) => { const body = JSON.parse(options.body); sent = body; sentSystems.push(body.systemInstruction.parts[0].text); return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({ question: replies.shift() }) }] } }] })); };
  replies.push('앞서 세운 가설을 검증하려면 무엇부터 해볼 건가요?', '만약 이 사례처럼 바꿀 수 없는 제약이 있다면 무엇부터 적어 보겠어요?');
  r = await question(post('/v1/question', ask), env);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).question, '만약 이 사례처럼 바꿀 수 없는 제약이 있다면 무엇부터 적어 보겠어요?', 'a presumptive question is retried once');
  assert.equal(sentSystems.length, 2);
  assert.match(sentSystems[1], /직전 응답이 규칙을 어겼다: 사용자가 말하지 않은/);
  replies.push('현재 기획 중이신 기능에서는 무엇을 바꾸실 건가요?', '하신 것처럼 오피스 맵을 연동하면 무엇이 달라질까요?');
  assert.equal((await question(post('/v1/question', ask), env)).status, 502, 'still presumptive after the retry: the app falls back to a default question');
  replies.push('이 방식을 곧바로 적용해 볼 수 있습니까?', '이 방식을 적용한다면 어떤 화면부터 바꾸겠어요?');
  assert.equal((await (await question(post('/v1/question', ask), env)).json()).question, '이 방식을 적용한다면 어떤 화면부터 바꾸겠어요?', 'yes/no questions are retried');
  // A vague last answer is flagged and the follow-up must ask for the concrete reason.
  sentSystems.length = 0;
  replies.push('이 사례에서 다음으로 해볼 작은 실험은 무엇인가요?', '좋다고 느낀 건 이 사례의 어느 장면 때문인가요?');
  r = await question(post('/v1/question', { ...ask, turns: [{ question: '무엇이 새로웠나요?', answer: '좋은 사례인 것 같다' }] }), env);
  assert.equal(JSON.parse(sent.contents[0].parts[0].text).lastAnswerVague, true);
  assert.equal((await r.json()).question, '좋다고 느낀 건 이 사례의 어느 장면 때문인가요?');
  assert.equal(sentSystems.length, 2, 'a follow-up that ignores a vague answer is retried');
  sentSystems.length = 0;
  replies.push('이 제약이 없다면 어떤 실험을 먼저 하겠어요?');
  r = await question(post('/v1/question', { ...ask, turns: [{ question: '무엇이 새로웠나요?', answer: '은행 화면은 못 바꾸니 앱 안의 선택 흐름만 바꿨다는 점' }] }), env);
  assert.equal(JSON.parse(sent.contents[0].parts[0].text).lastAnswerVague, false);
  assert.equal(r.status, 200);
  assert.equal(sentSystems.length, 1, 'concrete answers need no retry');
  replies.push('이 제약이 없다면 어떤 실험을 먼저 하겠어요');
  assert.equal((await (await question(post('/v1/question', ask), env)).json()).question, '이 제약이 없다면 어떤 실험을 먼저 하겠어요?', 'a missing question mark is added');
  assert.equal(questionProblem('이 자료에서 가장 먼저 풀어야 할 문제는 무엇인가요?'), '', 'open "무엇인가요" questions pass');
  assert.ok(questionProblem('사내 회의봇을 처음 기획할 때 어떤 가설을 세우고 개발을 시작하셨습니까?'), 'author actions are not asked back as the person own');
  assert.ok(questionProblem('봇을 만들기로 결심했을 때 어떤 불편이 가장 컸나요?'));
  assert.ok(questionProblem('북극성 지표로 월 반납 건수를 설정하셨을 때 발견하신 가장 중요한 문제는 무엇인가요?'), 'honorific past actions of the author are flagged, whatever the verb');
  assert.equal(questionProblem('좋다고 느끼신 이유는 자료의 어떤 장면 때문인가요?'), '', 'reactions to reading are allowed');
  assert.equal(questionProblem('만약 새 미션을 설계하신다면 어떤 심리를 활용해 보고 싶으세요?'), '', 'hypothetical honorifics are allowed');
  assert.equal(questionProblem('만약 회의봇을 만든다면 어떤 불편부터 풀어 보겠어요?'), '', 'hypothetical framing passes');
  assert.equal(questionProblem('그렇게 느낀 건 자료의 어떤 장면 때문인가요?', { lastAnswerVague: true }), '');
  assert.equal(vagueAnswer('흥미롭다'), true);
  assert.equal(vagueAnswer('제약을 먼저 적는 점'), false, 'short Korean answers can still be specific');
  assert.equal(vagueAnswer('글쎄'), true);
  assert.equal(vagueAnswer('은행 화면을 바꿀 수 없다는 제약 때문에 앱 안의 흐름만 바꾼 점이 인상적이었다'), false, 'long, specific answers are not vague even with evaluative words');
  globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answer) }] } }] })); };

  // Feedback comments only; it never returns rewritten text.
  answer = { claim: '주장은 분명합니다.', evidence: '“토스 사례”는 기록 요약과 연결됩니다.', separation: '출처 표시가 필요합니다.', counterpoint: '제약이 없는 팀이라면?' };
  r = await feedback(post('/v1/feedback', draft), env);
  assert.equal(r.status, 200);
  const comments = await r.json();
  assert.deepEqual(Object.keys(comments).filter(k => k !== 'model'), ['claim', 'evidence', 'separation', 'counterpoint']);
  assert.ok(!('body' in comments) && !('title' in comments), 'feedback never returns replacement text');
  assert.match(sent.systemInstruction.parts[0].text, /고쳐 쓰거나 대체 문단·문장을 제시하지 않는다/);
  assert.equal(JSON.parse(sent.contents[0].parts[0].text).records[0].thought, '제약부터 적어야겠다.');
  assert.equal((await feedback(post('/v1/feedback', { ...draft, body: '짧은 글' }), env)).status, 400);
  assert.equal((await feedback(post('/v1/feedback', { ...draft, records: Array(9).fill(draft.records[0]) }), env)).status, 400);
  answer = { claim: '주장은 분명합니다.' };
  assert.equal((await feedback(post('/v1/feedback', draft), env)).status, 502, 'all four aspects are required');

  // Monthly reflection: only the person's own thoughts, themes must cite at least two sent records.
  const month = { month: '2026-09', records: [{ title: 'A', thought: '작게 시험하자', topics: ['PM'] }, { title: 'B', thought: '실험부터', topics: [] }, { title: 'C', thought: '고객을 좁히자' }] };
  answer = { themes: [{ theme: '작은 실험으로 시작하기', records: [0, 1, 1, 9] }, { theme: '한 기록뿐', records: [2] }], explore: ['실험 설계 기초', ''] };
  r = await reflection(post('/v1/reflection', month), env);
  assert.equal(r.status, 200);
  const summary = await r.json();
  assert.deepEqual(summary.themes, [{ theme: '작은 실험으로 시작하기', records: [0, 1] }], 'out-of-range and single-record themes are dropped');
  assert.deepEqual(summary.explore, ['실험 설계 기초']);
  assert.match(sent.systemInstruction.parts[0].text, /2개 이상/);
  assert.equal(JSON.parse(sent.contents[0].parts[0].text).records[1].index, 1);
  assert.equal((await reflection(post('/v1/reflection', { ...month, records: month.records.slice(0, 1) }), env)).status, 400);
  assert.equal((await reflection(post('/v1/reflection', { ...month, month: '9월' }), env)).status, 400);
  assert.equal((await reflection(post('/v1/reflection', { ...month, records: [{ title: 'A', thought: '' }, { title: 'B', thought: 'x' }] }), env)).status, 400, 'records without a thought are not accepted');
  answer = { themes: [{ theme: '근거 하나', records: [0] }], explore: [] };
  assert.equal((await reflection(post('/v1/reflection', month), env)).status, 502, 'a summary without a two-record theme is rejected');
  // A theme that sweeps in most records is retried once with the reason.
  const five = { month: '2026-09', records: ['작게 실험하자', '실험 단위를 줄이자', '고객을 좁히자', '인터뷰 질문을 좁히자', '전시 동선이 흥미롭다'].map((thought, i) => ({ title: `기록 ${i}`, thought })) };
  const reflectionReplies = [
    { themes: [{ theme: '좁히고 작게 하기', records: [0, 1, 2, 3, 4] }], explore: ['A'] },
    { themes: [{ theme: '작게 실험하기', records: [0, 1] }, { theme: '고객 좁히기', records: [2, 3] }], explore: ['A'] }
  ];
  const reflectionSystems = [];
  globalThis.fetch = async (_url, options) => { const body = JSON.parse(options.body); reflectionSystems.push(body.systemInstruction.parts[0].text); return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(reflectionReplies.shift()) }] } }] })); };
  r = await reflection(post('/v1/reflection', five), env);
  assert.deepEqual((await r.json()).themes.map(t => t.records), [[0, 1], [2, 3]]);
  assert.equal(reflectionSystems.length, 2);
  assert.match(reflectionSystems[1], /한 주제가 기록 대부분을 덮었다/);
  assert.match(reflectionSystems[0], /서로 다른 생각은 다른 주제로 나눈다/);
  assert.equal(reflectionProblem({ themes: [{ records: [0, 1, 2, 3] }] }, five), '한 주제가 기록 대부분을 덮었다. 서로 다른 생각은 나누고, 맞지 않는 기록은 빼라.');
  assert.equal(reflectionProblem({ themes: [{ records: [0, 1, 2] }] }, { records: [1, 2, 3] }), '', 'small months are not judged by coverage');
  globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return new Response(JSON.stringify({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(answer) }] } }] })); };

  // Insight accepts a custom perspective only alongside its matching built-in role.
  const body = '반복 작업 자동화의 효과를 실제 사용 시간으로 확인합니다. '.repeat(4);
  assert.equal((await insight(post('/v1/insight', { title: '가상', body, role: '기획자', perspective }), env)).status, 400);
  assert.equal((await insight(post('/v1/insight', { title: '가상', body, role: '연구자', perspective: { ...perspective, prompts: 'x' } }), env)).status, 400);
  answer = null;
  globalThis.fetch = async (_url, options) => { sent = JSON.parse(options.body); return new Response('{}', { status: 500 }); };
  await insight(post('/v1/insight', { title: '가상', body, role: '연구자', perspective }), env);
  assert.deepEqual(JSON.parse(sent.contents[0].parts[0].text).perspective, perspective);
  assert.match(sent.systemInstruction.parts[0].text, /perspective가 있으면/);
  await insight(post('/v1/insight', { title: '가상', body, role: '연구자' }), env);
  assert.ok(!('perspective' in JSON.parse(sent.contents[0].parts[0].text)), 'built-in perspectives send nothing extra');

  // Routing: origin check and health advertise the new routes.
  const routed = await worker.fetch(new Request('https://worker.test/v1/question', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' }), { ...env, ALLOWED_ORIGIN: 'https://memoive.vercel.app' });
  assert.equal(routed.status, 403);
  assert.deepEqual((await (await worker.fetch(new Request('https://worker.test/health'), env)).json()).coaching, ['question', 'feedback', 'reflection']);
  console.log('PASS: question, feedback and reflection routes validate input, share AI guards, keep the person as author, and insight accepts custom perspectives. No live Gemini requests.');
} finally { globalThis.fetch = original; }
