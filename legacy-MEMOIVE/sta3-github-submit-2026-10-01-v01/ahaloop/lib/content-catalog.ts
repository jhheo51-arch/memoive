export type ContentCard = {
  id: string;
  number: string;
  type: "뉴스" | "행사·공모전" | "참고 자료" | "채용·기회";
  title: string;
  summary: string;
  why: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  date: string;
  deadline?: string;
  topics: string[];
  roles: string[];
};

export const contentCatalog: ContentCard[] = [
  {
    id: "openai-data-agent-2026-09-10",
    number: "01",
    type: "뉴스",
    title: "업무 데이터에서 바로 답과 대시보드를 만드는 Data agent 공개",
    summary:
      "OpenAI가 조직의 데이터와 권한 체계를 연결해 질문, 분석, 대시보드와 실행까지 이어지는 Data agent를 공개했습니다.",
    why: "고객 데이터가 보고서에 머무르지 않고 실제 사업개발 판단으로 이어지는 흐름을 살펴볼 수 있어요.",
    source: "OpenAI",
    sourceUrl: "https://openai.com/index/put-data-to-work/",
    publishedAt: "2026-09-10",
    date: "9월 10일",
    topics: ["AI", "고객 경험", "스타트업"],
    roles: ["사업개발", "전략", "기획"],
  },
  {
    id: "kstartup-techfest-vietnam-2026",
    number: "02",
    type: "행사·공모전",
    title: "TECHFEST 2026 베트남 K-스타트업 통합관 참가기업 모집",
    summary:
      "업력 7년 이내 창업기업을 대상으로 전시, IR 컨설팅, 현지 바이어·투자자 매칭과 항공·숙박비 일부를 지원합니다.",
    why: "글로벌 파트너 발굴과 시장 검증을 준비하는 사업개발 담당자가 바로 검토할 수 있는 기회예요.",
    source: "K-Startup · 창업진흥원",
    sourceUrl:
      "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?pbancSn=179192&schM=view",
    publishedAt: "2026-09-10",
    date: "9월 10일",
    deadline: "9월 17일 16:00 마감",
    topics: ["스타트업", "AI"],
    roles: ["사업개발", "전략", "마케팅"],
  },
  {
    id: "kstartup-investment-contract-guide-2026",
    number: "03",
    type: "참고 자료",
    title: "2026 벤처투자 표준계약서와 해설서",
    summary:
      "투자계약서와 주주 간 계약을 나누고 조항 중요도, 분쟁 사례, 유의사항과 실무 체크리스트를 정리한 공식 자료입니다.",
    why: "투자 협상을 앞둔 초기 팀이 계약 검토 질문을 빠르게 정리하는 데 활용할 수 있어요.",
    source: "K-Startup · 중소벤처기업부",
    sourceUrl:
      "https://www.k-startup.go.kr/web/contents/webNOTICE_MATR.do?id=175807&page=1&schM=view&viewCount=18",
    publishedAt: "2026-07-10",
    date: "7월 10일 갱신",
    topics: ["스타트업"],
    roles: ["사업개발", "전략", "운영"],
  },
  {
    id: "springer-ai-customer-service-2026",
    number: "04",
    type: "참고 자료",
    title: "AI 고객 서비스의 활용과 다음 연구 방향",
    summary:
      "자연어 처리, 예측 분석, 개인화가 고객 서비스에 미치는 영향과 개인정보·윤리·지속적 모니터링 과제를 함께 다룬 오픈 액세스 연구입니다.",
    why: "고객 경험 자동화를 설계할 때 효율뿐 아니라 신뢰와 사람의 검토 지점을 함께 점검할 수 있어요.",
    source: "Springer Nature",
    sourceUrl: "https://link.springer.com/article/10.1007/s11761-026-00500-2",
    publishedAt: "2026-06-21",
    date: "6월 21일",
    topics: ["AI", "고객 경험"],
    roles: ["전략", "연구", "기획"],
  },
  {
    id: "work24-saas-business-development-search",
    number: "05",
    type: "채용·기회",
    title: "고용24에서 사업개발·SaaS 채용 직접 확인하기",
    summary:
      "고용24 공식 상세검색에서 사업개발, 영업, SaaS 관련 키워드와 지역·경력 조건을 조합해 현재 모집 중인 공고를 확인할 수 있습니다.",
    why: "특정 회사 한 곳보다 현재 열려 있는 기회를 직접 비교하고 싶은 사업개발 관심자에게 맞아요.",
    source: "고용24",
    sourceUrl: "https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do",
    publishedAt: "2026-09-11",
    date: "실시간 검색",
    topics: ["커리어", "스타트업"],
    roles: ["사업개발", "마케팅", "운영"],
  },
];

export const extraNewsCard: ContentCard = {
  id: "openai-enterprise-execution-2026-08-12",
  number: "+1",
  type: "뉴스",
  title: "기업의 AI 활용이 ‘도움받기’에서 ‘실행 맡기기’로 이동하고 있어요",
  summary:
    "OpenAI가 기업과 직무별 AI 활용 데이터를 바탕으로 에이전트형 업무가 확산되는 흐름과 선도 조직의 차이를 정리했습니다.",
  why: "이번 브리프의 데이터 활용 뉴스에서 한 걸음 더 나아가, 실제 조직 운영 방식의 변화를 볼 수 있어요.",
  source: "OpenAI",
  sourceUrl: "https://openai.com/index/how-enterprises-put-ai-to-work/",
  publishedAt: "2026-08-12",
  date: "8월 12일",
  topics: ["AI", "스타트업"],
  roles: ["사업개발", "전략", "운영"],
};
