# MEMOIVE Gemini 중간 서버

브라우저에 Gemini 인증값을 노출하지 않기 위한 Cloudflare Worker입니다.

- `GEMINI_API_KEY`는 Cloudflare의 비밀값으로만 등록합니다.
- 허용된 MEMOIVE 주소의 `/v1/refine` 요청만 처리합니다.
- 요청 본문이나 생성 결과를 서버에 저장하거나 로그로 남기지 않습니다.
- Gemini 한도 초과나 네트워크 오류가 나면 MEMOIVE 화면이 기기 안의 기본 초안으로 전환합니다.

배포 후 생성된 Worker 주소 뒤에 `/v1/refine`를 붙여 `dist/config.js`의 `MEMOIVE_AI_ENDPOINT`에 입력합니다.
