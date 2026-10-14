const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const DataTools = require('../frontend/js/data-tools.js');

const base = { id: 'base', title: '계좌 개설 이탈 문제', summary: '은행 화면 제약 속에서 실험으로 다음 행동을 찾았다.', thought: '내 프로젝트도 제약 조건을 먼저 적고 실험 범위를 정해야겠다.', topics: ['PM 사례'] };
const thoughtMatch = { id: 'thought', title: '온보딩 개선 회고', summary: '가입 흐름을 다듬었다.', thought: '처음부터 크게 바꾸지 말고 아주 작은 실험 하나로 반응을 보고 싶다. 다음 주에 바로 해보자.', topics: [] };
const topicMatch = { id: 'topic', title: '고객 인터뷰 정리', summary: '중요한 고객을 찾는 방법.', thought: '', topics: ['PM 사례'] };
const wordMatch = { id: 'word', title: '은행 앱 리뉴얼', summary: '화면 구조를 바꿨다.', thought: '', topics: [] };
const unrelated = { id: 'none', title: '주말 등산 기록', summary: '날씨가 좋았다.', thought: '', topics: ['일상'] };
const example = { id: 'example-toss-experiments', title: '예시 사례', summary: '예시', thought: '실험 설계 메모', topics: [] };

const related = DataTools.relatedRecords(base, [base, thoughtMatch, topicMatch, wordMatch, unrelated]);
assert.equal(related.length, 3, 'shows at most three related records with a reason');
assert.ok(!related.some(item => item.record.id === 'none'), 'records without overlap are not recommended');
assert.ok(related.every(item => item.reason && (item.evidence.thoughtWords.length + item.evidence.topics.length + item.evidence.words.length) > 0), 'every recommendation carries at least one evidence kind');

const byThought = related.find(item => item.record.id === 'thought');
assert.deepEqual(byThought.evidence.thoughtWords, ['실험']);
assert.equal(byThought.reason, '두 기록 모두 생각에 ‘실험’을 남겼어요.');
const quoteCore = byThought.evidence.thoughtQuote.replace(/^…|…$/g, '');
assert.ok(quoteCore.length <= 40, 'quote stays within 40 characters');
assert.ok(thoughtMatch.thought.includes(quoteCore), 'quote is an exact excerpt of the recommended record’s thought');
assert.ok(quoteCore.includes('실험'), 'quote contains the shared word');
assert.ok(!byThought.evidence.words.includes('실험'), 'a thought word is not repeated as a plain word');

const byTopic = related.find(item => item.record.id === 'topic');
assert.equal(byTopic.reason, '‘PM 사례’ 주제가 이어져요.');
assert.equal(byTopic.evidence.thoughtQuote, '');

const byWord = related.find(item => item.record.id === 'word');
assert.match(byWord.reason, /^제목·요약에 ‘.+’(이|가) 함께 나와요\.$/);

const withExample = DataTools.relatedRecords(base, [example]);
assert.equal(withExample[0].isExample, true, 'example records are labelled');
assert.equal(DataTools.relatedRecords(base, [thoughtMatch])[0].isExample, false);

const short = { ...thoughtMatch, id: 'short', thought: '작은 실험부터' };
assert.equal(DataTools.relatedRecords(base, [short])[0].evidence.thoughtQuote, '작은 실험부터', 'short thoughts are quoted whole');
const filler = { id: 'filler', title: '전혀 다른 글', summary: '무관', thought: '같은 방식이면 좋겠다.', topics: [] };
assert.equal(DataTools.relatedRecords({ ...base, thought: '같은 화면이면 좋겠다.' }, [filler]).length, 0, 'function words alone do not make a recommendation');
assert.equal(DataTools.relatedRecords(base, [{ ...filler, thought: '실험을 먼저 해보자' }])[0].evidence.thoughtWords[0], '실험', 'particles are ignored when matching');
assert.equal(DataTools.relatedRecords({ ...base, thought: '' }, [base]).some(item => item.evidence.thoughtWords.length), false, 'no thought overlap without a base thought');

// The record view escapes text before marking shared words.
const app = fs.readFileSync('frontend/js/app.js', 'utf8');
// Line endings depend on the checkout (CRLF on Windows), so match either.
const esc = app.match(/const esc=.*?;\r?\n/)[0];
const markWords = app.match(/function markWords\(value,words\)\{.*\}\r?\n/)[0];
const sandbox = {};
vm.runInNewContext(esc + markWords + 'out=[markWords("<b>작은 실험</b>",["실험"]),markWords("A&amp B",["amp"]),markWords("그대로",[])];', sandbox);
assert.equal(sandbox.out[0], '&lt;b&gt;작은 <mark>실험</mark>&lt;/b&gt;');
assert.equal(sandbox.out[1], 'A&amp;<mark>amp</mark> B');
assert.equal(sandbox.out[2], '그대로');
assert.ok(app.includes('의미가 비슷한지는 판단하지 않아요'), 'the panel states that matching is word-based');

const html = fs.readFileSync('index.html', 'utf8'), sw = fs.readFileSync('sw.js', 'utf8');
for (const asset of ['./frontend/js/discovery-hints.js?v=77-related-why', './frontend/css/discovery.css?v=77-related-why']) {
  assert.ok(html.includes(asset), `${asset} is loaded`);
  assert.ok(sw.includes(`'${asset}'`), `${asset} is cached for offline use`);
}

console.log('PASS: related records explain thought/topic/word overlap, quote exact thought excerpts, label examples, escape output; discovery assets wired. Synthetic fixtures only.');
