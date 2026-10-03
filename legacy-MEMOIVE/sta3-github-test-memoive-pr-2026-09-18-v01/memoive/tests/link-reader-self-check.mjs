import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { validateHttpUrl, parseReaderText, summarize } = require('../link-reader.js');

const sample = `Title: 기록을 다시 쓰는 방법
URL Source: https://example.com/article
Published Time: 2026-09-26

Markdown Content:
좋은 기록은 원문 주소를 먼저 보존해야 나중에 사실을 다시 확인할 수 있습니다.
자동 정리는 원문에 있는 문장을 근거로 보여줄 때 더 신뢰할 수 있습니다.
사용자가 저장한 이유를 한 줄 덧붙이면 같은 콘텐츠도 나만의 기록이 됩니다.`;

const parsed = parseReaderText(sample, 'https://example.com/article');
const result = summarize(parsed.content, parsed.title);

console.assert(validateHttpUrl('https://example.com') === 'https://example.com/', 'HTTPS 주소를 받아야 합니다.');
console.assert(validateHttpUrl('javascript:alert(1)') === '', '안전하지 않은 주소를 거절해야 합니다.');
console.assert(parsed.title === '기록을 다시 쓰는 방법', '제목을 읽어야 합니다.');
console.assert(result.points.length === 3, '핵심 문장 세 개를 골라야 합니다.');
console.assert(result.evidence[0].text === result.points[0], '요약 문장과 근거가 연결되어야 합니다.');

console.log('link-reader self-check: ok');
