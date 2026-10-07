# MEMOIVE 이어서 작업하기
한국어로 비개발자에게 설명하고 기존 기록·디자인·저장 형식을 보존하세요. 이 파일은 Claude에서의 실제 실행 성공을 주장하지 않습니다.

## 현재 기준
1. [README](README.md): 실행·검사·공개 서비스.
2. [제품 기획서](docs/PRD_MEMOIVE_2026-10-06-v01.md): 2026-10-07 운영 보완 포함.
3. [검증 범위](docs/verification.md): 실제 효과와 기술 검사의 구분.
4. [Worker 운영 안내](cloudflare-worker/README.md).

기존 2026-10-03 PRD의 “Gemini 연결 전·비공개 Site” 설명은 당시 상태입니다. 현재 두 AI 경로가 연결되어 있고 Site는 공개입니다.

## 실행과 검사
memoive 폴더에서:
```sh
python scripts/serve.py --port 4182
node scripts/check.mjs
python tests/preview-safety-check.py
```
검사는 합성 데이터이며 실 AI 호출을 하지 않습니다. 다른 기기·브라우저는 소유자 코드로 연결하면 같은 비공개 저장소를 사용합니다.

운영 원본은 TOBEA 저장소의 project/memoive/입니다. Vercel 기준 폴더도 project/memoive/입니다.

## 주요 파일
- frontend/js/app.js: 기존 화면·저장·창작 흐름.
- frontend/js/insight-context.js: 본문 준비·선택 맥락·전송 동의·구조화 답변 표시.
- frontend/js/insight-contract.js: 브라우저/서버 공용 응답 구조·인용·숫자 존재 검사.
- frontend/js/insight-tools.js: 기본 질문, 기록 변경 식별, 이전 AI 결과 선택.
- frontend/js/link-reader.js: 공개 원문 읽기·사진 추출.
- frontend/js/storage-guard.js / frontend/js/data-tools.js: 저장 안전·백업·분석.
- cloudflare-worker/src/insight.mjs: 기록 AI.
- cloudflare-worker/src/index.js: 창작 AI·Origin/크기/요청 제한.
- sw.js: 캐시 목록. 새 화면 파일 추가 시 index.html·캐시·serve.py 허용 목록을 함께 확인.

## 필수 원칙
- 원문 사실·MEMOIVE 해석·사용자 생각을 구분합니다. 인용 존재 검사가 의미 정확성을 보장하지 않습니다.
- 기록 AI: 원문과 선택 관점, 선택한 맥락만 전송. 동의 없는 자동 재요청·개인 기록 전송 금지.
- 창작 AI: 별도 확인창의 전송 범위와 본문 추가 선택을 유지합니다.
- 응답 전에 원문/선택 본문/맥락이 바뀌면 이전 응답을 적용하지 않습니다.
- 스크롤 막대만 숨기고 터치·휠·키보드·긴 내용 접근은 유지합니다.
- 예시·합성 시험을 실제 고객 성과로 기록하지 않습니다. 실제 사용 효과는 사용자가 수집할 예정입니다.
- API 키·백업·개인 기록을 출력하거나 커밋·업로드하지 않습니다. .env.example은 빈 안내값만 유지합니다.
- 사용자 로컬 키는 TOBEA/project/memoive/.env입니다. 읽어서 출력하거나 다른 코드 폴더에 복제하지 않습니다.
- 로컬 .env는 자동으로 Worker에 반영되지 않습니다. 운영 키는 Cloudflare Secret입니다.
- 운영 Origin만 허용하므로 로컬 AI 실패가 정상일 수 있습니다. 키·권한을 추측으로 변경하지 마세요.
- 공개 Origin 허용은 사용자 인증이 아니며 지역별 제한은 전체 예산 상한이 아닙니다.
- GitHub 반영, Sites 화면 배포, Cloudflare Worker 배포를 구분합니다. 임의의 새 Site 생성·권한 확대·유료 전환 금지.
- 다른 프로젝트와 이미 진행 중인 사용자 변경을 섞지 않습니다.
