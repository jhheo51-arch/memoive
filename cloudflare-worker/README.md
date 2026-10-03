# MEMOIVE Gemini 중간 서버

브라우저에 Gemini 인증값을 노출하지 않기 위한 Cloudflare Worker입니다.

- `GEMINI_API_KEY`는 Cloudflare의 비밀값으로만 등록합니다.
- 허용된 MEMOIVE 주소의 `/v1/refine` 요청만 처리합니다.
- 요청 본문이나 생성 결과를 서버에 저장하거나 로그로 남기지 않습니다.
- Gemini 한도 초과나 네트워크 오류가 나면 MEMOIVE 화면이 기기 안의 기본 초안으로 전환합니다.

배포 후 생성된 Worker 주소 뒤에 `/v1/refine`를 붙여 `memoive/config.js`의 `MEMOIVE_AI_ENDPOINT`에 입력합니다.

## 운영 전 확인 — 현재 미연결

이 코드는 연결 준비용이며 현재 운영 Site의 AI 주소는 비어 있습니다. Gemini 실호출·Worker 배포·실제 무료 한도 설정은 완료하지 않았습니다. `wrangler.toml`의 모델명은 프로젝트에서 지원 여부를 확인해야 하는 설정값입니다.

허용 출처(Origin) 목록은 브라우저 요청을 제한하는 보조 장치일 뿐 로그인 인증이 아닙니다. 공개 운영 전 사용자 인증, 서버 측 사용량 제한, 기록 외부 전송 안내·동의를 구현해야 합니다. API 키는 코드나 GitHub에 넣지 말고 Worker의 비밀값으로만 등록하세요. Google 프로젝트의 실제 모델·한도 확인 전에는 무료 운영을 보장할 수 없습니다.
