# Career Signal Archive

BA·Consultant·PM/PO 커리어 뉴스레터를 날짜별로 모아 보는 정적 웹사이트입니다.

## 현재 기능

- 월별 달력과 발행일 표시
- 날짜별 뉴스레터 회차 목록
- 같은 날짜의 여러 회차 지원
- 전체 뉴스레터 열기와 달력 홈 복귀
- 최근 뉴스레터 목록
- 뉴스레터가 없는 날짜 안내
- 데스크톱·모바일 대응

## 파일 구조

- `dist/index.html`: 달력형 메인 화면
- `dist/assets/editions.js`: 실제 발행 회차 목록
- `dist/assets/app.js`: 달력과 회차 선택 동작
- `dist/assets/styles.css`: 화면 디자인
- `dist/editions/`: 날짜별 전체 뉴스레터

새 뉴스레터를 추가할 때는 검증된 HTML을 `dist/editions/`에 보존하고 `dist/assets/editions.js`에 실제 발행 회차 한 건을 추가합니다. 디자인 수정 버전은 별도 회차로 등록하지 않습니다.

현재 사이트는 외부 서비스, 비밀 인증값, 설치 항목 없이 동작합니다. `dist/index.html`을 열면 로컬에서 확인할 수 있습니다.
