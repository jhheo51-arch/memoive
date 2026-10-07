# MEMOIVE Gemini 중간 서버
브라우저에 API 키를 노출하지 않고 동의한 자료를 Gemini로 전달하는 Cloudflare Worker입니다.

## 2026-10-06 확인 상태
이 폴더의 Worker 소스는 운영 사이트 작업본의 분석·창작 요청 코드에 맞췄습니다. 운영 `/health`에서 `ready=true`, `insightProtocol=2`를 확인했고, 공개 시험 문장 한 건의 실제 Gemini 응답은 `analysisVersion=3`, 근거 3개, 검색어 4개를 반환했습니다. `insightProtocol`은 요청 형식 번호이고 `analysisVersion`은 분석 내용 형식 번호이므로 두 값이 달라도 오류가 아닙니다. 당시 운영 모델 설정은 `gemini-3.5-flash-lite`였습니다. 이 한 건은 다양한 원문에서의 정확도나 글 품질을 보장하지 않습니다.

- POST /v1/insight: 제목·본문·관점과 선택 맥락(thought/concern/output).
- POST /v1/refine: 선택 기록·요약·생각·목적·관점·초안. 선택 시 sourceExcerpt 추가.
- GET /health: 준비 상태와 응답 형식 버전. 실제 생성 성공 검사는 별도입니다.

기록 AI는 80~60,000자 원문과 맥락 항목별 1,000자 제한, 구조화 응답, 원문 구절 ID를 이용한 인용 연결·사실 항목 숫자 존재 검사를 적용합니다. 전체 의미의 사실 검증은 아닙니다. 창작 AI는 사용자가 고른 ‘다시 쓸 방법’과 내 생각을 받아 초안을 제안할 수 있지만, 기록 분석과 같은 구조화 인용 검사를 모두 적용하지는 않습니다.

## 설정과 별도 환경
- GEMINI_API_KEY는 Cloudflare Secret으로만 등록합니다. .env를 브라우저로 제공하거나 Git에 올리지 않습니다.
- GEMINI_MODEL은 자신의 프로젝트에서 실제 이용 가능 여부를 확인합니다.
- ALLOWED_ORIGIN은 허용할 화면 주소를 명시합니다. 운영 Vercel 주소와 승인한 Cloudflare Pages·GitHub Pages 화면만 허용하며 로컬 미리보기와 관계없는 사이트는 거절됩니다.
- AI_RECORDS_ENABLED=true 및 AI_RATE_LIMITER가 필요합니다. 바인딩 누락 시 요청을 차단합니다.
- wrangler.toml의 이름·namespace는 기존 운영 프로젝트 설정입니다. 다른 계정에서는 자신의 Worker·미사용 namespace를 선택하고 기존 운영 Worker를 덮어쓰지 마세요.
- `frontend/js/config.js`에는 키가 아니라 자신의 Worker `/v1/insight` 및 `/v1/refine` 주소를 사용합니다.

Origin 허용은 사용자 인증이 아니고 외부 요청에서 위조할 수 있습니다. 현재 5회/60초는 지역별 남용 완화이며 Google 무료 일일 요청 수·전 세계 총량·요금 상한이 아닙니다. 본격 공개 확장 전 사용자 인증·개인별 할당·전체 예산 보호를 추가 검토해야 합니다. 유료 전환은 자동으로 하지 않습니다.

## 배포와 검사
wrangler.toml을 사용하는 배포에는 `src/index.js`, `src/insight.mjs`, 그리고 상위 앱의 `frontend/js/insight-contract.js`가 필요합니다. 단일 `src` 폴더만 복사하면 안 됩니다.

대시보드의 단일 파일 편집기를 사용하는 경우:
```sh
node cloudflare-worker/build-dashboard.mjs ../memoive-worker-new-version.mjs
```
memoive 폴더에서 실행하며, 새 파일 경로만 받습니다. 생성 파일은 공개 화면 자산 경로에 넣지 않습니다. 코드만 포함하고 키는 포함하지 않습니다. 기존 운영 설정과 배포 대상을 확인한 뒤 적용하세요.

기록 분석 요청은 한글 60,000자를 담을 수 있도록 250,000바이트까지 받고, 창작 요청은 기존 100,000바이트 제한을 유지합니다. 제한을 넘으면 원문을 몰래 더 잘라 보내지 않고 오류 안내를 합니다. 시간 초과·공급자 한도·형식/근거 오류 시 기존 사용자 자료는 보존합니다.

서버 코드는 자료와 생성 결과를 별도 저장·로그 출력하지 않습니다. 공급자 데이터 정책과 Cloudflare 기본 운영 로그가 없다는 뜻은 아닙니다. 비공개·개인 자료를 사용하지 않는 합성 검사부터 수행하세요.
