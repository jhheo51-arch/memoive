# 아하루프 하네스 계약

이 문서는 아하루프를 수정한 뒤 무엇을 확인해야 완료로 볼지 정한 운영 계약입니다. 자동검사 통과와 실제 고객 성과는 구분합니다.

## 작업 흐름

1. `AGENTS.md`, 최신 PRD와 `작업일지.md`에서 현재 결정을 확인합니다.
2. 고객이 해야 할 일을 줄이는 최소 변경만 구현합니다.
3. `npm run harness:pass`로 제품 규칙, 운영 경고, 회귀, 코드 품질과 빌드를 확인합니다.
4. 로그인·저장·권한이 바뀌면 로컬 서버에서 `npm run test:local-api`를 추가로 실행합니다.
5. GitHub PR의 `AHALOOP harness`가 통과한 뒤 `main`에 반영합니다.
6. 배포 뒤에는 구현 결과와 실제 고객 관찰을 작업일지에 따로 기록합니다.

## 반드시 지킬 경계

- 첫 혜택은 `거주지 → 만 나이 → 생활 상태` 세 번의 선택 안에 보여 줍니다.
- 이후 화면은 한 번에 질문 또는 결정 하나만 요구합니다.
- 예상 금액, 직접 입력한 실제 수령액, 합성 테스트 수치를 섞지 않습니다.
- 외부 테스트 화면은 ChatGPT 로그인을 요구하고 고객별 기록을 분리합니다.
- 운영 검증실과 발송·파일럿 API는 `AHALOOP_OPERATOR_USER_IDS`에 등록된 운영자만 사용할 수 있습니다.
- API 키, 로그인 값, 전화번호와 고객 원문은 저장소·검사 출력·작업일지에 남기지 않습니다.
- 실제 문자 발송, 기관 신청, 공개 공고 자동 수집은 명시된 동의와 출처별 허용 여부가 확인되기 전에는 자동 실행하지 않습니다.

## 검사와 근거 위치

| 확인 대상 | 실행 또는 근거 |
| --- | --- |
| 패스 선택 수·화면 질문 규칙 | `npm run test:pass-harness` |
| 출처·발송·데이터·후속 작업 경고 | `npm run test:operations-health` |
| 온통청년 API 인증·응답·장애 경계 | `npm run test:youth-center-api` |
| 요구 추적·포트폴리오 회귀 | `npm test` |
| 코드 품질·배포 빌드 | `npm run lint`, `npm run build` |
| 로그인·권한·저장 통합 | 로컬 서버 실행 뒤 `npm run test:local-api` |
| GitHub 병합 게이트 | `.github/workflows/ahaloop-harness.yml` |
| 외부 로그인 보호 감시 | `.github/workflows/ahaloop-operations-monitor.yml` |
| 제품 작업 지침 | `AGENTS.md` |
| 반복 작업 절차 | `.agents/skills/ahaloop-pass-harness/SKILL.md` |
| 실제 결정·검증 기록 | `작업일지.md` |

`npm run harness:pass`가 성공했다는 것은 코드와 합성 규칙을 확인했다는 뜻입니다. 실제 사용자 5명의 첫 혜택 도달률, 준비 시작률과 수령 성과는 파일럿을 진행한 뒤에만 성과로 기록합니다.
