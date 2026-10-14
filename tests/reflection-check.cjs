const assert = require('node:assert/strict');
const fs = require('node:fs');
const DataTools = require('../frontend/js/data-tools.js');
const R = require('../frontend/js/reflection-tools.js');

const rec = (id, savedAt, thought = '', extra = {}) => ({ id, title: `기록 ${id}`, savedAt, thought, topics: [], type: 'article', ...extra });
const today = '2026-10-14';

// ⑥ Memory of the day: exact 365/90/30-day anniversaries with a thought; the longest gap wins.
const records = [rec('m30', '2026-09-14', '한 달 전 생각'), rec('m90', '2026-07-16', '석 달 전 생각'), rec('m29', '2026-09-15', '29일 전'), rec('blank', '2025-10-14', '')];
assert.equal(R.memoryOfTheDay(records, today).record.id, 'm90');
assert.equal(R.memoryOfTheDay(records, today).label, '3개월 전 오늘의 생각');
assert.equal(R.memoryOfTheDay([...records, rec('y1', '2025-10-14', '1년 전')], today).record.id, 'y1');
assert.equal(R.memoryOfTheDay(records, today, { skip: ['m90'] }).record.id, 'm30', 'snoozed records are skipped for the day');
assert.equal(R.memoryOfTheDay([{ ...records[1], resurfaceOff: true }, records[0]], today).record.id, 'm30', 'turned-off records never return');
assert.equal(R.memoryOfTheDay(records, today, { isExample: r => r.id !== 'm29' }), null, 'examples and records without an anniversary are not shown');
assert.equal(R.memoryOfTheDay([rec('blank', '2026-07-16', '')], today), null, 'a record needs a thought to be revisited');

// ⑥ Follow-ups never edit earlier thoughts and count toward the north-star metric.
let r = rec('f', '2026-07-16', '처음 생각');
assert.equal(DataTools.revisitedThought(r), false);
Object.assign(r, DataTools.appendFollowup(r, { perspectiveId: 'planner', perspectiveName: '기획자', text: '지금은 다르게 본다' }, '2026-10-14T03:00:00.000Z'));
assert.deepEqual(r.thoughts.map(e => [e.kind || 'base', e.sections[0].text]), [['base', '처음 생각'], ['followup', '지금은 다르게 본다']]);
assert.equal(r.thought, '처음 생각\n지금은 다르게 본다');
assert.equal(DataTools.revisitedThought(r), true);
Object.assign(r, DataTools.upsertThought(r, { perspectiveId: 'planner', perspectiveName: '기획자', sections: [{ prompt: '', text: '기획자 생각' }] }));
assert.equal(r.thoughts.find(e => e.kind === 'followup').sections[0].text, '지금은 다르게 본다', 'editing a perspective never overwrites a follow-up');
assert.equal(DataTools.validateBackup({ records: [r] }).records[0].thoughts.filter(e => e.kind === 'followup').length, 1, 'follow-ups survive backup');
const sameDay = rec('s', '2026-10-14');
Object.assign(sameDay, DataTools.upsertThought(sameDay, { perspectiveId: 'planner', sections: [{ prompt: '', text: '오늘 생각' }] }, '2026-10-14T03:00:00.000Z'));
assert.equal(DataTools.revisitedThought(sameDay), false, 'a thought written on the day of saving is not a return');

// ⑤ Principles: the person writes the sentence; under two live evidence records it stays a draft.
let principles = R.savePrinciple([], { statement: ' 제약부터 적고 작게 시험한다 ', reason: '두 사례 모두 그랬다', evidenceIds: ['a', 'a', 'b'] }, '2026-10-14T01:00:00.000Z', 'p1');
assert.deepEqual(principles[0].evidenceIds, ['a', 'b']);
assert.equal(principles[0].statement, '제약부터 적고 작게 시험한다');
assert.throws(() => R.savePrinciple([], { statement: '' }), /한 문장/);
assert.throws(() => R.savePrinciple([], { statement: '가'.repeat(121) }), /120자/);
const live = [{ id: 'a' }, { id: 'b' }];
assert.equal(R.principleStatus(principles[0], live).draft, false);
const afterDelete = R.principleStatus(principles[0], [{ id: 'a' }]);
assert.deepEqual([afterDelete.draft, afterDelete.missing], [true, ['b']], 'a deleted evidence record makes it a draft and is reported');
principles = R.savePrinciple(principles, { ...principles[0], statement: '바꿀 수 없는 것부터 적는다' }, '2026-10-15T01:00:00.000Z', 'p1');
assert.deepEqual(principles[0].history, [{ at: '2026-10-14T01:00:00.000Z', statement: '제약부터 적고 작게 시험한다' }], 'earlier wording is kept');
principles = R.savePrinciple(principles, { ...principles[0], reason: '이유만 바꿈' }, '2026-10-16T01:00:00.000Z', 'p1');
assert.equal(principles[0].history.length, 1, 'only wording changes add history');
assert.equal(R.mergePrinciples(principles, [{ ...principles[0], statement: '오래된 사본', updatedAt: '2026-10-01T00:00:00.000Z' }])[0].statement, '바꿀 수 없는 것부터 적는다', 'older copies do not win a merge');
assert.equal(R.mergePrinciples([], [{ id: 'x', statement: '다른 기기의 원칙', updatedAt: '2026-10-01T00:00:00.000Z' }]).length, 1);
assert.deepEqual(R.cleanPrinciples([{ id: 'x' }, null, { statement: 'id 없음' }]), []);
assert.deepEqual(R.sharedThoughtWords([{ thought: '작은 실험을 하자' }, { thought: '실험부터 작은 단위로' }, { thought: '무관' }], DataTools.words).sort(), ['작은', '실험'].sort());
const match = R.principleMatches({ id: 'new', title: '새 기록', summary: '', thought: '바꿀 수 없는 제약을 먼저 적었다', topics: [] }, principles, DataTools.relatedRecords);
assert.equal(match[0].principle.id, 'p1');
assert.ok(match[0].words.length > 0);
assert.deepEqual(R.principleMatches({ id: 'a', title: 'a', thought: '바꿀 수 없는 것', topics: [] }, principles, DataTools.relatedRecords), [], 'records already used as evidence are not suggested again');

// ④ Monthly report: device-only counts, minimum size, bias and returns.
const month = Array.from({ length: 5 }, (_, i) => rec(`r${i}`, `2026-09-0${i + 1}`, i < 4 ? `실험 생각 ${i}` : '', { topics: i < 4 ? ['PM 사례'] : ['일상'], type: i ? 'article' : 'video', thoughts: i === 0 ? [{ id: 't', perspectiveId: 'planner', sections: [{ prompt: '', text: '실험 생각 0' }], createdAt: '2026-09-01T01:00:00.000Z', updatedAt: '2026-09-20T01:00:00.000Z' }] : undefined }));
const example = rec('ex', '2026-09-03', '예시', { topics: ['예시'] });
const report = R.monthlyReport([...month, example, rec('oct', '2026-10-01', '다음 달')], '2026-09', { isExample: x => x.id === 'ex', localDay: DataTools.localDay, relate: DataTools.relatedRecords, perspectiveName: id => ({ planner: '기획자' })[id] || id });
assert.equal(report.total, 5, 'examples and other months are excluded');
assert.equal(report.enough, true);
assert.equal(report.thoughtRate, 80);
assert.deepEqual(report.byTopic, [['PM 사례', 4], ['일상', 1]]);
assert.deepEqual(report.byType, [['article', 4], ['video', 1]]);
assert.deepEqual(report.byPerspective, [['기획자', 1]]);
assert.deepEqual(report.bias, { topic: 'PM 사례', share: 80 });
assert.deepEqual(report.revisitedIds, ['r0'], 'a thought changed later in the month counts as a return');
assert.ok(report.mostConnected && report.mostConnected.count >= 1);
const small = R.monthlyReport(month.slice(0, 4), '2026-09', {});
assert.equal(small.enough, false);
assert.equal(small.bias, null, 'no bias note under five records');
assert.deepEqual(R.reportMonths([...month, example, rec('oct', '2026-10-01')], x => x.id === 'ex'), ['2026-10', '2026-09']);

// AI reflections are stored per month and cleaned on load.
assert.deepEqual(R.cleanReflections({ '2026-09': { themes: [{ theme: '작은 실험', recordIds: ['r0', 'r1', 'r1'] }, { theme: '' }], explore: ['A/B 테스트 설계', ''], createdAt: '2026-10-01T00:00:00.000Z' }, bad: { themes: [] }, '2026-08': { themes: [] } }), { '2026-09': { themes: [{ theme: '작은 실험', recordIds: ['r0', 'r1'] }], explore: ['A/B 테스트 설계'], createdAt: '2026-10-01T00:00:00.000Z' } });
const backup = DataTools.validateBackup({ records: [], principles, reflections: { '2026-09': { themes: [{ theme: 't', recordIds: ['a'] }], explore: [] } } });
assert.deepEqual(R.cleanPrinciples(backup.principles), principles);
assert.ok(R.cleanReflections(backup.reflections)['2026-09']);

// Wiring: storage, backup, sync, load order and offline cache.
const app = fs.readFileSync('frontend/js/app.js', 'utf8'), sync = fs.readFileSync('frontend/js/cloud-sync.js', 'utf8'), html = fs.readFileSync('index.html', 'utf8'), sw = fs.readFileSync('sw.js', 'utf8');
assert.equal((app.match(/principles:state\.principles,reflections:state\.reflections/g) || []).length, 2, 'local storage and backup export include principles and reflections');
assert.ok(sync.includes('ReflectionTools.mergePrinciples(state.principles,clean.principles)'));
assert.ok(html.indexOf('reflection-tools.js') < html.indexOf('frontend/js/app.js'));
for (const name of ['thought-memory', 'principle-ui', 'monthly-report']) {
  assert.ok(html.indexOf(`${name}.js`) > html.indexOf('perspective-ui.js'), `${name} loads after perspective-ui`);
  assert.ok(fs.readFileSync(`frontend/js/${name}.js`, 'utf8').includes('const safely='), `${name} cannot break core flows`);
}
for (const asset of ['js/reflection-tools.js', 'js/thought-memory.js', 'js/principle-ui.js', 'js/monthly-report.js', 'css/reflection.css']) assert.ok(sw.includes(`'./frontend/${asset}?v=80-reflection'`), `${asset} is cached`);

console.log('PASS: anniversaries, follow-ups and the return metric; principles with drafts, history and merge; monthly report counts, bias and returns; storage wiring. Synthetic fixtures only.');
