export type BenefitSource = {
  id: string;
  name: string;
  owner: string;
  coverage: string;
  url: string;
  method: "open_api" | "official_page";
  connection: "key_required" | "api_configured" | "monitor_ready" | "manual_verified";
  setupNote?: string;
  checkEveryMinutes: number;
  freshnessSlaMinutes: number;
  lastVerifiedAt: string;
  priority: "P0" | "P1" | "P2";
};

export const benefitSources: BenefitSource[] = [
  { id: "gov24-benefits-api", name: "보조금24 대한민국 공공서비스", owner: "행정안전부", coverage: "중앙부처·지자체 공공서비스 전국 기준", url: "https://www.data.go.kr/data/15113968/openapi.do", method: "open_api", connection: "key_required", checkEveryMinutes: 60, freshnessSlaMinutes: 180, lastVerifiedAt: "2026-09-14T10:20:00+09:00", priority: "P0" },
  { id: "bokjiro", name: "복지로 복지서비스", owner: "보건복지부·한국사회보장정보원", coverage: "생애주기·가구상황별 중앙·지자체·민간 복지", url: "https://www.data.go.kr/data/15090532/openapi.do", method: "open_api", connection: "key_required", checkEveryMinutes: 180, freshnessSlaMinutes: 360, lastVerifiedAt: "2026-09-14T10:30:00+09:00", priority: "P0" },
  { id: "youth-center-api", name: "온통청년 청년정책 API", owner: "국무조정실·한국고용정보원", coverage: "전국 청년정책·청년공간", url: "https://www.youthcenter.go.kr/cmnFooter/openapiIntro/oaiGuide", method: "open_api", connection: "key_required", setupNote: "연결 코드·오류 처리 준비 완료 · 인증키 발급 대기", checkEveryMinutes: 60, freshnessSlaMinutes: 180, lastVerifiedAt: "2026-09-26T17:28:00+09:00", priority: "P1" },
  { id: "work24", name: "고용24", owner: "고용노동부·한국고용정보원", coverage: "취업지원·훈련·실업·육아휴직·채용", url: "https://www.work24.go.kr/cm/main.do", method: "official_page", connection: "monitor_ready", checkEveryMinutes: 60, freshnessSlaMinutes: 180, lastVerifiedAt: "2026-09-14T10:40:00+09:00", priority: "P1" },
  { id: "specialist-sources", name: "전문기관 공식 원문 묶음", owner: "장학재단·국세청·문화누리·아이돌봄", coverage: "장학·세제·문화·돌봄의 세부 자격과 기한", url: "https://www.kosaf.go.kr/ko/main.do", method: "official_page", connection: "manual_verified", checkEveryMinutes: 360, freshnessSlaMinutes: 720, lastVerifiedAt: "2026-09-14T10:45:00+09:00", priority: "P1" },
  { id: "local-open-data", name: "지자체 열린데이터·공고", owner: "17개 시도·시군구", coverage: "지역 한정 현금·서비스·시설·모집 공고", url: "https://data.seoul.go.kr/together/guide/useGuide.do", method: "open_api", connection: "key_required", checkEveryMinutes: 60, freshnessSlaMinutes: 180, lastVerifiedAt: "2026-09-14T10:50:00+09:00", priority: "P2" },
];

export const sourceStatusLabel: Record<BenefitSource["connection"], string> = {
  key_required: "인증키 발급 필요",
  api_configured: "서버 인증키 연결 · 호출 검증 필요",
  monitor_ready: "변경 감시 설계 완료",
  manual_verified: "공식 원문 수동 검수",
};
