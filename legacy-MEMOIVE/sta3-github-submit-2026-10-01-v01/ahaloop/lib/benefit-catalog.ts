export type Benefit = {
  id: string;
  title: string;
  provider: string;
  category: "교통" | "취업·성장" | "교육" | "금융" | "주거" | "돌봄" | "생활·문화" | "안전·건강";
  audiences: string[];
  valueLabel: string;
  summary: string;
  matchReason: string;
  eligibility: string[];
  missing: string[];
  deadline: string;
  deadlineDate?: string;
  sourceUrl: string;
  sourceCheckedAt: string;
  confidence: number;
  matched?: string[];
  failed?: string[];
  eligibilityStatus?: string;
  ruleVersion?: string;
  status: "ready" | "check" | "watch";
  estimatedValue: number;
  valueCadence: "monthly" | "annual" | "one_time" | "non_cash";
  amountBasis: string;
  urgency: "urgent" | "new" | "normal" | "always";
  freshnessLabel: string;
  preparationSteps?: string[];
  applicationCta?: string;
};

export const benefits: Benefit[] = [
  {
    id: "culture-nuri-2026", title: "2026 문화누리카드", provider: "한국문화예술위원회", category: "생활·문화",
    audiences: ["전 연령", "저소득 가구", "학생", "중장년", "노년"], valueLabel: "연 15만 원 + 생애주기 추가 1만 원",
    summary: "6세 이상 기초생활수급자·차상위계층의 문화예술·여행·체육 활동을 지원합니다.",
    matchReason: "연령과 관계없이 소득 자격이 핵심이에요. 수급·차상위 여부를 확인하면 바로 판정할 수 있어요.",
    eligibility: ["6세 이상", "기초생활수급자 또는 차상위계층"], missing: ["기초생활수급·차상위 여부", "기존 카드와 자동재충전 여부"],
    deadline: "발급 2026년 11월 30일까지 · 마감 시각은 기관 확인 · 예산 소진 시 조기 마감", deadlineDate: "2026-11-30", sourceUrl: "https://www.mnuri.kr/munhwa/introduceNuri.do", sourceCheckedAt: "2026-09-18",
    confidence: 81, status: "check", estimatedValue: 0, valueCadence: "annual", amountBasis: "소득 자격 미확인으로 합계에서 제외", urgency: "urgent", freshnessLabel: "오늘 공식 원문 확인",
  },
  {
    id: "earned-income-credit-2026-h2", title: "2026년 상반기분 근로장려금 반기 신청", provider: "국세청", category: "금융",
    audiences: ["직장인", "저소득 가구", "1인 가구", "부부 가구"], valueLabel: "소득·재산·가구유형별 산정",
    summary: "근로소득자의 지원 체감도를 높이기 위해 당해연도 소득을 기준으로 반기별 신청·지급하는 제도입니다.",
    matchReason: "가구유형과 소득·재산에 따라 금액이 크게 달라져요. 9월 신청기한을 먼저 확인해야 해요.",
    eligibility: ["근로소득이 있는 가구", "가구·소득·재산 기준 충족"], missing: ["가구유형", "2026년 근로소득", "가구원 재산 합계"],
    deadline: "2026년 상반기분 신청 9월", sourceUrl: "https://www.nts.go.kr/nts/na/ntt/selectNttInfo.do?nttSn=1352882", sourceCheckedAt: "2026-09-14",
    confidence: 72, status: "check", estimatedValue: 0, valueCadence: "one_time", amountBasis: "가구·소득·재산 미확인으로 합계에서 제외", urgency: "urgent", freshnessLabel: "오늘 공식 공지 확인",
  },
  {
    id: "kpass-youth-2026", title: "모두의 카드(K-패스) 청년 환급", provider: "국토교통부", category: "교통",
    audiences: ["청년", "직장인", "구직자", "학생"], valueLabel: "월 약 18,000원 예상",
    summary: "월 15회 이상 대중교통을 이용하는 만 19~34세 청년에게 이용금액의 30%를 환급합니다.", matchReason: "민서님의 월 교통비 6만 원을 기준으로 계산했어요.",
    eligibility: ["만 19~34세", "월 15회 이상 대중교통 이용", "K-패스 회원·카드 등록"], missing: ["최근 한 달 실제 이용 횟수"], deadline: "상시",
    sourceUrl: "https://www.korea.kr/news/policyFocusView.do?newsId=148958934&pkgId=49500831", sourceCheckedAt: "2026-09-14", confidence: 92, status: "ready", estimatedValue: 18000,
    valueCadence: "monthly", amountBasis: "월 교통비 60,000원의 청년 환급률 30% 적용", urgency: "always", freshnessLabel: "오늘 공식 원문 확인",
    preparationSteps: ["만 나이와 지난달 대중교통 이용 횟수 확인", "K-패스 카드·회원 등록 여부 확인", "공식 안내에서 적용 지역과 환급 조건 최종 확인"], applicationCta: "공식 안내에서 등록 방법 확인",
  },
  {
    id: "qnet-youth-fee-2026", title: "청년 국가기술자격시험 응시료 지원", provider: "한국산업인력공단", category: "교육",
    audiences: ["청년", "학생", "직장인", "구직자"], valueLabel: "응시료 50% · 연 3회",
    summary: "만 34세 이하 청년에게 한국산업인력공단 시행 국가기술자격시험 응시료의 절반을 지원합니다.", matchReason: "연령 조건은 맞고, 시험 계획만 확인하면 바로 사용할 수 있어요.",
    eligibility: ["만 34세 이하", "한국산업인력공단 시행 종목", "연간 3회 한도"], missing: ["응시 예정 종목", "올해 사용 횟수"], deadline: "예산 소진 시까지",
    sourceUrl: "https://www.q-net.or.kr/man004.do?gId=02&gSite=Q&id=man00401s01&inMain=yes&notiType=", sourceCheckedAt: "2026-09-14", confidence: 84, status: "check", estimatedValue: 25000,
    valueCadence: "one_time", amountBasis: "응시료 50,000원인 시험 1회 응시를 가정한 예시", urgency: "normal", freshnessLabel: "오늘 공식 원문 확인",
  },
  {
    id: "national-scholarship-2026", title: "2026 국가장학금 Ⅰ유형", provider: "한국장학재단", category: "교육",
    audiences: ["대학생", "신입생", "편입생", "복학생"], valueLabel: "학자금 지원구간별 차등",
    summary: "소득수준과 성적·이수학점 등 요건을 바탕으로 대학 등록금 부담을 낮추는 장학금입니다.", matchReason: "대학생·진학 예정자라면 학적과 학자금 지원구간을 확인해야 해요. 재학생은 1차 신청이 원칙이에요.",
    eligibility: ["대한민국 국적", "지원대상 대학 재학", "소득·성적 등 심사 통과"], missing: ["학교·학적", "학자금 지원구간", "신청 차수와 가구원 동의"], deadline: "학기별 공고 확인",
    sourceUrl: "https://www.kosaf.go.kr/ko/scholar.do?pg=scholarship05_12_01_01&ttab1=1", sourceCheckedAt: "2026-09-14", confidence: 78, status: "check", estimatedValue: 0,
    valueCadence: "one_time", amountBasis: "학자금 지원구간과 등록금 미확인으로 합계에서 제외", urgency: "normal", freshnessLabel: "3일 이내 공식 원문 확인",
  },
  {
    id: "parent-benefit-2026", title: "부모급여 지원", provider: "보건복지부", category: "돌봄",
    audiences: ["영유아 가구", "주부", "맞벌이", "한부모"], valueLabel: "아동 연령에 따라 월 지급",
    summary: "영아기 집중돌봄을 지원하기 위해 대한민국 국적을 가진 대상 아동 가구에 현금 또는 보육서비스로 지원합니다.", matchReason: "돌보는 영유아의 생년월일과 보육서비스 이용 여부를 알면 중복지원까지 확인할 수 있어요.",
    eligibility: ["대상 연령 아동", "대한민국 국적 등 세부 요건"], missing: ["아동 생년월일", "어린이집·종일제 아이돌봄 이용 여부"], deadline: "출생·전입 후 신청 시점에 따라 소급 범위 확인",
    sourceUrl: "https://www.bokjiro.go.kr/ssis-tbu/twataa/wlfareInfo/moveTWAT52011M.do?wlfareInfoId=WLF00004657&wlfareInfoReldBztpCd=01", sourceCheckedAt: "2026-09-14", confidence: 76, status: "check", estimatedValue: 0,
    valueCadence: "monthly", amountBasis: "아동 연령·보육 이용 미확인으로 합계에서 제외", urgency: "new", freshnessLabel: "오늘 복지로 원문 확인",
  },
  {
    id: "child-care-service-2026", title: "아이돌봄서비스 정부지원", provider: "성평등가족부·한국건강가정진흥원", category: "돌봄",
    audiences: ["주부", "맞벌이", "한부모", "영유아·아동 가구"], valueLabel: "소득유형별 이용요금 차등 지원",
    summary: "양육공백이 생긴 가정의 생후 3개월~만 12세 이하 아동에게 돌봄 인력이 방문합니다.", matchReason: "자녀 연령, 양육공백 사유와 가구소득을 확인하면 정부지원 유형을 좁힐 수 있어요.",
    eligibility: ["대상 연령 아동", "양육공백", "중복지원 제한", "가구소득 기준"], missing: ["자녀 연령", "양육공백 사유", "소득유형", "중복지원 여부"], deadline: "상시 · 지역 제공기관 연계 가능 여부 확인",
    sourceUrl: "https://idolbom.go.kr/front/srvcUtztnGuide/govApply", sourceCheckedAt: "2026-09-14", confidence: 75, status: "check", estimatedValue: 0,
    valueCadence: "non_cash", amountBasis: "가구별 정부지원 비율 미확인으로 합계에서 제외", urgency: "normal", freshnessLabel: "오늘 공식 원문 확인",
  },
  {
    id: "employment-support-2026", title: "국민취업지원제도", provider: "고용노동부·한국고용정보원", category: "취업·성장",
    audiences: ["구직자", "경력단절", "청년", "중장년"], valueLabel: "취업지원서비스 + 유형별 수당",
    summary: "취업을 원하는 사람에게 진단·상담·훈련·일경험·일자리 연계와 유형별 소득지원을 제공합니다.", matchReason: "구직 중이거나 경력단절 상태라면 고용24에서 유형 자가진단 후 바로 신청 흐름으로 이어갈 수 있어요.",
    eligibility: ["취업 의사와 구직활동", "연령·소득·재산·취업경험 유형별 기준"], missing: ["최근 취업경험", "가구소득·재산", "현재 구직등록 여부"], deadline: "상시",
    sourceUrl: "https://www.work24.go.kr/cm/main.do?searchGubun=6", sourceCheckedAt: "2026-09-14", confidence: 77, status: "check", estimatedValue: 0,
    valueCadence: "non_cash", amountBasis: "지원유형 판정 전으로 현금 합계에서 제외", urgency: "always", freshnessLabel: "오늘 고용24 확인",
  },
  {
    id: "senior-care-2026", title: "노인맞춤돌봄서비스", provider: "보건복지부", category: "안전·건강",
    audiences: ["65세 이상", "독거노인", "조손가구", "돌봄 필요 노인"], valueLabel: "안전지원·생활교육·일상생활 지원",
    summary: "일상생활이 어려운 취약노인의 안전과 건강을 확인하고 필요한 돌봄서비스를 연계합니다.", matchReason: "65세 이상이며 혼자 살거나 돌봄이 필요하다면 수급 자격과 실제 돌봄 필요도를 확인해야 해요.",
    eligibility: ["65세 이상", "기초생활·차상위·기초연금 수급 등", "독거·조손 등 돌봄 필요"], missing: ["수급 자격", "동거인·보호자 여부", "이동·식사·안전 확인 필요"], deadline: "상시 · 주민센터 또는 수행기관 문의",
    sourceUrl: "https://www.mohw.go.kr/menu.es?mid=a10712010400", sourceCheckedAt: "2026-09-14", confidence: 79, status: "check", estimatedValue: 0,
    valueCadence: "non_cash", amountBasis: "서비스 제공 여부는 지자체 선정 결과에 따름", urgency: "new", freshnessLabel: "오늘 보건복지부 원문 확인",
  },
  {
    id: "emergency-safety-2026", title: "독거노인·장애인 응급안전안심서비스", provider: "보건복지부·지방자치단체", category: "안전·건강",
    audiences: ["독거노인", "장애인", "안전취약 1인 가구"], valueLabel: "응급호출·화재·활동 감지 안전망",
    summary: "가정 내 장비로 응급상황과 화재·활동을 감지해 지역센터와 119로 연결하는 안전 지원입니다.", matchReason: "혼자 살며 상시 안전 확인이 필요하다면 주민센터에서 지역 대상 기준을 확인할 가치가 커요.",
    eligibility: ["독거노인 또는 장애인 등 지역 기준", "상시 안전 확인 필요"], missing: ["동거·보호자 여부", "건강·장애 상태", "거주지 지자체 대상 기준"], deadline: "상시 · 읍면동 행정복지센터 문의",
    sourceUrl: "https://www.mohw.go.kr/board.es?act=view&bid=0019&list_no=1479709&mid=a10411010100&nPage=1", sourceCheckedAt: "2026-09-14", confidence: 71, status: "check", estimatedValue: 0,
    valueCadence: "non_cash", amountBasis: "현금이 아닌 안전 서비스로 합계에서 제외", urgency: "normal", freshnessLabel: "제도 원문 확인 · 지역 기준 추가 확인 필요",
  },
  {
    id: "seoul-youth-rent-2026", title: "서울시 청년월세지원 다음 모집 감시", provider: "서울특별시", category: "주거",
    audiences: ["서울 청년", "월세 1인 가구"], valueLabel: "월 최대 20만 원 · 최대 12개월", summary: "서울에 월세로 거주하는 청년의 실제 임차료를 지원하는 사업입니다. 2026년 접수는 종료됐습니다.",
    matchReason: "서울 월세 거주 조건과 연결되지만 보증금·월세·소득·무주택 여부를 더 확인해야 해요.", eligibility: ["서울 거주 만 19~39세", "월세 거주 무주택자", "보증금·월세·소득 등 세부 기준 충족"],
    missing: ["임차보증금과 월세", "가구 소득과 무주택 여부", "다음 모집 일정"], deadline: "2026년 접수 종료 · 다음 회차 감시", sourceUrl: "https://housing.seoul.go.kr/site/main/content/sh01_060513", sourceCheckedAt: "2026-09-14",
    confidence: 76, status: "watch", estimatedValue: 0, valueCadence: "non_cash", amountBasis: "2026년 접수 종료로 현재 합계에서 제외", urgency: "normal", freshnessLabel: "다음 모집 감시",
  },
];

export const recoverableNowValue = benefits.reduce((sum, benefit) => sum + benefit.estimatedValue, 0);
