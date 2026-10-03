import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateBackup, mergeRecords, cleanOutputs, mergeOutputs, mergeAnalytics, analyticsSummary, relatedRecords, toMarkdown, buildDraft } = require('../data-tools.js');

const first = { id: '1', type: 'article', label: 'ARTICLE', savedAt: '2026-09-26', title: '기록 습관 만들기', summary: '작은 기록을 이어갑니다.', thought: '질문을 붙이자.', topics: ['기록 습관'], points: ['매일 한 문장'], actions: [], evidence: [], confidence: 90, url: 'https://example.com/one' };
const second = { ...first, id: '2', title: '기록을 다시 발견하기', thought: '달력으로 보자.', url: 'https://example.com/two' };

const backup = validateBackup({ records: [first, { ...second, url: 'javascript:alert(1)' }], role: '기획자', resurface: true });
const merged = mergeRecords([first], [second]);
const related = relatedRecords(first, [first, second]);

console.assert(backup.records[1].url === '', '안전하지 않은 주소를 제거해야 합니다.');
console.assert(merged.length === 2, '서로 다른 기록을 모두 보존해야 합니다.');
console.assert(related[0].record.id === '2', '같은 주제의 기록을 연결해야 합니다.');
console.assert(toMarkdown(first).includes('## 나의 기록'), '재활용 문서에 내 기록을 포함해야 합니다.');

const events = [
  { id: 'e1', name: 'record_opened', at: '2026-09-26T00:00:00.000Z', recordId: '1', type: 'article' },
  { id: 'e2', name: 'record_reused', at: '2026-09-26T00:01:00.000Z', recordId: '1', type: 'article' }
];
const output = { id: 'o1', type: 'project', title: '기록 프로젝트', body: '본문', purpose: '팀 제안', viewpoint: '작게 검증하자.', sourceRecordIds: ['1'], createdAt: '2026-09-26T00:00:00.000Z', updatedAt: '2026-09-26T00:00:00.000Z' };
const summary = analyticsSummary([{ ...first, summaryRating: 'helpful' }, second], events, [output]);
console.assert(summary.revisitRate === 50, '다시 본 기록의 비율을 계산해야 합니다.');
console.assert(summary.helpfulRate === 100, '평가한 요약의 도움 비율을 계산해야 합니다.');
console.assert(summary.conversionRate === 50, '결과물로 이어진 영감의 비율을 계산해야 합니다.');
console.assert(mergeAnalytics({ events }, { events }).events.length === 2, '같은 분석 사건을 중복 저장하지 않아야 합니다.');
console.assert(cleanOutputs([{ ...output, type: 'unknown' }])[0].type === 'idea', '알 수 없는 결과물 형식을 안전하게 정리해야 합니다.');
console.assert(cleanOutputs([{ ...output, type: 'social', tone: 'friendly' }])[0].type === 'social_post', '이전 SNS 결과물 형식을 인스타그램 게시물로 이어가야 합니다.');
console.assert(mergeOutputs([output], [output]).length === 1, '같은 결과물을 중복 저장하지 않아야 합니다.');
console.assert(buildDraft({ type: 'proposal', purpose: '팀 제안', viewpoint: '작게 검증하자.', records: [first] }).body.includes('## 제안 목적'), '선택한 형식에 맞는 초안을 만들어야 합니다.');
const socialDraft = buildDraft({ type: 'social_post', tone: 'insight', purpose: '공유하기 위해', viewpoint: '기록은 행동으로 이어질 때 가치가 생긴다.', records: [{ ...first, topics: ['웹 콘텐츠'] }] });
console.assert(socialDraft.body.startsWith('웹 콘텐츠를 다시 보니'), '한국어 조사를 자연스럽게 연결해야 합니다.');
console.assert(socialDraft.body.includes('나의 관점'), '출처에서 얻은 내용과 사용자의 관점을 구분해야 합니다.');

console.log('data-tools self-check: ok');
