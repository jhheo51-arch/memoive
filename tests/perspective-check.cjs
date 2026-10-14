const assert = require('node:assert/strict');
const fs = require('node:fs');
const DataTools = require('../frontend/js/data-tools.js');
const P = require('../frontend/js/perspective-tools.js');

// Perspectives: four built-ins, custom ones validated and capped.
assert.deepEqual(P.BUILTIN.map(p => p.name), ['기획자', '마케터', '연구자', '일상 기록자']);
assert.deepEqual(P.find('planner', []).prompts, ['문제는 무엇인가', '내 가설', '내가 해볼 작은 실험']);
let custom = P.create({ name: ' UX 리서처 ', prompts: '무엇이 새로웠나\n\n내 일에 적용한다면\n무엇이 새로웠나', base: '연구자' }, [], 'custom-ux');
assert.deepEqual(custom, [{ id: 'custom-ux', name: 'UX 리서처', label: 'UX 리서처 관점', hint: '내가 만든 관점', prompts: ['무엇이 새로웠나', '내 일에 적용한다면'], base: '연구자', builtin: false }]);
assert.throws(() => P.create({ name: '' }, custom), /이름/);
assert.throws(() => P.create({ name: '기획자' }, custom), /같은 이름/);
assert.throws(() => P.create({ name: 'ux 리서처' }, custom), /같은 이름/);
assert.throws(() => P.create({ name: '가'.repeat(21) }, custom), /20자/);
assert.equal(P.create({ name: '과학', prompts: '1\n2\n3\n4\n5', base: '해커' }, custom, 'custom-sci')[1].prompts.length, 4, 'templates hold at most four prompts');
assert.equal(P.create({ name: '과학', base: '해커' }, custom, 'custom-sci')[1].base, '기획자', 'unknown base falls back to a role the AI server accepts');
let many = custom;
for (let i = 0; i < 5; i++) many = P.create({ name: `관점${i}` }, many, `custom-${i}`);
assert.equal(many.length, P.MAX_CUSTOM);
assert.throws(() => P.create({ name: '하나 더' }, many), /6개/);
assert.equal(P.update('custom-ux', { name: 'UX 연구', prompts: [], base: '마케터' }, custom)[0].name, 'UX 연구');
assert.equal(P.update('custom-ux', { name: 'UX 리서처', prompts: [] }, custom).length, 1, 'renaming to its own name is allowed');
assert.deepEqual(P.remove('custom-ux', custom), []);
assert.equal(P.idForRole('마케터'), 'marketer');
assert.equal(P.idForRole('없는 역할'), 'planner');
assert.deepEqual(P.merge([{ id: 'a', name: '로컬' }], [{ id: 'a', name: '원격' }, { id: 'b', name: '새 관점' }]).map(p => p.name), ['로컬', '새 관점']);
assert.deepEqual(P.cleanCustom([{ id: 'planner', name: '가짜' }, { id: 'x', name: '' }, null]), [], 'built-in ids and empty names are rejected');

// Legacy thought strings read as one free entry, unchanged.
const legacy = { id: 'r1', title: '기록', thought: '예전에 남긴 생각' };
assert.deepEqual(DataTools.normalizeThoughts(legacy), { thoughts: [{ id: 'legacy', perspectiveId: '', perspectiveName: '', sections: [{ prompt: '', text: '예전에 남긴 생각' }], createdAt: '', updatedAt: '' }], thought: '예전에 남긴 생각' });
assert.deepEqual(DataTools.normalizeThoughts({ id: 'r0', title: '빈 기록' }), { thoughts: [], thought: '' });

// Saving a perspective thought; `thought` keeps only the person's words, never template labels.
let record = { ...legacy };
Object.assign(record, DataTools.upsertThought(record, { perspectiveId: 'planner', perspectiveName: '기획자', sections: [{ prompt: '', text: '한 줄' }, { prompt: '내 가설', text: '작게 시험한다' }, { prompt: '문제는 무엇인가', text: '' }] }, '2026-10-14T01:00:00.000Z'));
assert.equal(record.thought, '예전에 남긴 생각\n한 줄\n작게 시험한다');
assert.ok(!record.thought.includes('내 가설'));
const plannerEntry = record.thoughts.find(e => e.perspectiveId === 'planner');
assert.equal(plannerEntry.createdAt, '2026-10-14T01:00:00.000Z');
Object.assign(record, DataTools.upsertThought(record, { perspectiveId: 'planner', perspectiveName: '기획자', sections: [{ prompt: '', text: '고친 한 줄' }] }, '2026-10-14T02:00:00.000Z'));
assert.equal(record.thoughts.filter(e => e.perspectiveId === 'planner').length, 1, 'one entry per perspective is edited in place');
assert.equal(record.thoughts.find(e => e.perspectiveId === 'planner').updatedAt, '2026-10-14T02:00:00.000Z');
Object.assign(record, DataTools.upsertThought(record, { entryId: 'legacy', perspectiveId: 'custom-ux', perspectiveName: 'UX 리서처', sections: [{ prompt: '', text: '예전에 남긴 생각' }] }));
assert.equal(record.thoughts.find(e => e.id === 'legacy').perspectiveId, 'custom-ux', 'an unlabeled thought can be adopted into a perspective');
Object.assign(record, DataTools.upsertThought(record, { perspectiveId: 'planner', sections: [{ prompt: '', text: '  ' }] }));
assert.ok(!record.thoughts.some(e => e.perspectiveId === 'planner'), 'clearing every field removes that entry');

// Deleting a perspective never deletes its thoughts; the name snapshot remains.
const afterDelete = DataTools.normalizeThoughts({ ...record });
assert.equal(afterDelete.thoughts.find(e => e.perspectiveId === 'custom-ux').perspectiveName, 'UX 리서처');
assert.equal(P.find('custom-ux', P.remove('custom-ux', custom)), null);

// Older writers append to `thought`; the extra text becomes its own entry, nothing is lost.
const appended = { ...record, thought: `${record.thought}\n중복 저장 때 남긴 메모` };
const repaired = DataTools.normalizeThoughts(appended);
assert.equal(repaired.thought, appended.thought);
assert.equal(repaired.thoughts.at(-1).sections[0].text, '중복 저장 때 남긴 메모');
assert.equal(DataTools.normalizeThoughts(repaired).thoughts.length, repaired.thoughts.length, 'normalizing twice is stable');
const replaced = DataTools.normalizeThoughts({ ...record, thought: '다른 기기의 이전 앱에서 고친 생각' });
assert.ok(replaced.thought.includes('예전에 남긴 생각') && replaced.thought.includes('다른 기기의 이전 앱에서 고친 생각'));

// Backup round trip keeps entries; old backups without `thoughts` restore unchanged.
const backup = DataTools.validateBackup(JSON.stringify({ records: [record, { id: 'old', title: '이전 백업', thought: '이전 백업의 생각' }], perspectives: custom, perspectiveId: 'custom-ux' }));
assert.deepEqual(backup.records[0].thoughts, DataTools.normalizeThoughts(record).thoughts);
assert.equal(backup.records[1].thought, '이전 백업의 생각');
assert.equal(backup.records[1].thoughts[0].id, 'legacy');
assert.deepEqual(P.cleanCustom(backup.perspectives), custom);
assert.equal(backup.perspectiveId, 'custom-ux');
assert.deepEqual(DataTools.validateBackup({ records: [] }).perspectives, []);

// Merging backups: legacy text on both sides is kept; timestamped edits of one entry keep the newer.
assert.equal(DataTools.mergeRecords([{ id: 'm', title: 't', savedAt: '2026-10-01', thought: 'A' }], [{ id: 'm', title: 't', savedAt: '2026-10-01', thought: 'B' }])[0].thought, 'A\nB');
assert.equal(DataTools.mergeRecords([{ id: 'm', title: 't', savedAt: '2026-10-01', thought: 'A' }], [{ id: 'm', title: 't', savedAt: '2026-10-01', thought: 'A' }])[0].thought, 'A');
const older = { id: 'm', title: 't', savedAt: '2026-10-01', thoughts: [{ id: 'e1', perspectiveId: 'planner', perspectiveName: '기획자', sections: [{ prompt: '', text: '옛 버전' }], createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }] };
const newer = { ...older, thoughts: [{ ...older.thoughts[0], sections: [{ prompt: '', text: '새 버전' }], updatedAt: '2026-10-02T00:00:00.000Z' }] };
assert.equal(DataTools.mergeRecords([older], [newer])[0].thought, '새 버전');
assert.equal(DataTools.mergeRecords([newer], [older])[0].thought, '새 버전');

// Questions: answered ones are stored with their source; unanswered ones and unknown sources are not.
const asked = DataTools.upsertThought({ id: 'q', title: 'q' }, { perspectiveId: 'planner', perspectiveName: '기획자', sections: [{ prompt: '', text: '' }, { prompt: 'AI가 만든 질문인가요?', text: '내 답', source: 'ai-question' }, { prompt: '답하지 않은 질문', text: '', source: 'question' }, { prompt: '가짜 출처', text: '값', source: 'admin' }] });
assert.deepEqual(asked.thoughts[0].sections, [{ prompt: '', text: '' }, { prompt: 'AI가 만든 질문인가요?', text: '내 답', source: 'ai-question' }, { prompt: '가짜 출처', text: '값' }]);
assert.equal(asked.thought, '내 답\n값', 'question text never enters the plain thought');
assert.equal(DataTools.normalizeThoughts({ thoughts: asked.thoughts }).thoughts[0].sections[1].source, 'ai-question', 'question source survives backup cleaning');
const planner = P.find('planner', []);
assert.equal(P.defaultQuestions(planner).length, 3);
assert.equal(P.nextDefaultQuestion(planner, P.defaultQuestions(planner)), '', 'default questions run out after three');
const customQuestions = P.defaultQuestions(custom[0]);
assert.equal(customQuestions[0], '‘무엇이 새로웠나’에 대해 이 기록에서 떠오르는 것을 적어볼까요?', 'custom perspectives ask about their own template first');
assert.ok(customQuestions.length >= 3);

// Persistence, backup export, sync and AI wiring.
const app = fs.readFileSync('frontend/js/app.js', 'utf8'), sync = fs.readFileSync('frontend/js/cloud-sync.js', 'utf8'), ui = fs.readFileSync('frontend/js/perspective-ui.js', 'utf8');
assert.equal((app.match(/perspectives:state\.perspectives,perspectiveId:state\.perspectiveId/g) || []).length, 2, 'local storage and backup export include perspectives');
assert.ok(sync.includes('PerspectiveTools.merge(clean.perspectives,state.perspectives)'), 'sync from an older cloud copy cannot erase local perspectives');
assert.ok(ui.includes('state.role=p.base'), 'AI requests keep using a role the server accepts');
const html = fs.readFileSync('index.html', 'utf8'), sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(html.indexOf('perspective-tools.js') < html.indexOf('frontend/js/app.js'), 'perspective tools load before app state is built');
assert.ok(html.indexOf('perspective-ui.js') > html.indexOf('detail-navigation.js'));
for (const asset of ['./frontend/js/perspective-tools.js?v=79-coaching', './frontend/js/perspective-ui.js?v=80-reflection', './frontend/css/perspective.css?v=82-polish']) assert.ok(sw.includes(`'${asset}'`), `${asset} is cached`);

console.log('PASS: custom perspectives validate and cap, templates stay out of plain thoughts, legacy thoughts survive normalization, backup, merge and sync. Synthetic fixtures only.');
