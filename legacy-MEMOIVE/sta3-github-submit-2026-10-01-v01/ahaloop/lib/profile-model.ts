export const emptyProfile = {
  name: "회원", birthYear: 0, age: null as number | null, region: "", employmentStatus: "", housingStatus: "",
  annualIncome: 0, monthlyTransitCost: 0, hasStudentLoan: false, lifeEvent: "", preferredChannel: "kakao",
  consent: false, profileStatement: "", profileContext: [] as string[], householdType: "", careNeeds: [] as string[],
  confirmedFields: [] as string[], kpassRegistered: false, transitTrips: 0,
};
export type ProfileData = typeof emptyProfile;
// Clearing a choice means unknown, not an affirmative zero/false answer.
export function selectProfileField<K extends keyof ProfileData>(profile: ProfileData, key: K, value: ProfileData[K] | undefined): ProfileData {
  const known = value !== undefined && value !== "" && value !== null;
  return { ...profile, [key]: known ? value : emptyProfile[key], profileStatement: "", profileContext: [],
    confirmedFields: [...profile.confirmedFields.filter(field => field !== key), ...(known ? [key] : [])] };
}
export function resetProfileConditions(profile: ProfileData): ProfileData {
  return { ...emptyProfile, name: profile.name, preferredChannel: profile.preferredChannel, consent: profile.consent };
}
export function readProfile(row: Record<string, unknown> | null): ProfileData {
  return row?.profile_data ? { ...emptyProfile, ...JSON.parse(String(row.profile_data)) } : { ...emptyProfile };
}
export function interpret(statement: string, year = new Date().getFullYear()) {
  const patch: Partial<ProfileData> = { profileStatement: statement, profileContext: [], confirmedFields: [], careNeeds: [] };
  const evidence: { label: string; value: string; source: string }[] = [];
  const missing: string[] = [];
  const set = (field: keyof ProfileData, value: unknown, source: string, label: string) => {
    Object.assign(patch, { [field]: value }); patch.confirmedFields!.push(field);
    evidence.push({ label, value: Array.isArray(value) ? value.join(" · ") : String(value), source });
  };
  // ponytail: bounded Korean rules; ambiguous statements require confirmation, not a fabricated confidence score.
  const self = statement.includes("저는") ? statement.slice(statement.indexOf("저는")) : statement;
  const subject = self.split(/(?:어머니|아버지|엄마|아빠)는/)[0];
  const age = subject.match(/만\s*(\d{1,3})\s*세/);
  const birth = subject.match(/((?:19|20)\d{2})년생/);
  if (age && +age[1] <= 110 && !/잘못/.test(subject)) set("age", +age[1], age[0], "명시한 만 나이");
  else if (birth && +birth[1] <= year && +birth[1] >= year - 110 && !/잘못/.test(subject)) set("birthYear", +birth[1], birth[0], "출생연도");
  else missing.push("현재 만 나이는 몇 세인가요?");
  const regions = [...subject.matchAll(/(?<![가-힣])(?:서울|부산|대구|인천|광주|대전|울산|세종|경기(?:도)?|강원(?:특별자치도)?|충청북도|충북|충청남도|충남|전북(?:특별자치도)?|전라남도|전남|경상북도|경북|경상남도|경남|제주(?:특별자치도)?)/g)];
  const residential=regions.filter(m=>{
    const before=subject.slice(Math.max(0,m.index!-12),m.index!);
    const after=subject.slice(m.index!+m[0].length,m.index!+m[0].length+25);
    return /집은\s*$/.test(before)||(/사는|살아요|살고|거주|이사했/.test(after)&&!/^.{0,8}(출근|근무|일하)/.test(after));
  });
  const regionMatch=residential.at(-1)??(regions.length===1?regions[0]:null);
  if (regionMatch && !/정하지|어디.*살|이사할/.test(subject)) {
    const match = regionMatch;
    const names: Record<string,string> = { 서울:"서울특별시", 부산:"부산광역시", 대구:"대구광역시", 인천:"인천광역시", 광주:"광주광역시", 대전:"대전광역시", 울산:"울산광역시", 세종:"세종특별자치시", 경기:"경기도", 강원:"강원특별자치도", 충북:"충청북도", 충남:"충청남도", 전북:"전북특별자치도", 전남:"전라남도", 경북:"경상북도", 경남:"경상남도", 제주:"제주특별자치도" };
    const tail = subject.slice(match.index! + match[0].length).match(/^\s+([가-힣]{2,6}[구군])/);
    set("region", (names[match[0]] ?? match[0]) + (tail ? ` ${tail[1]}` : ""), match[0] + (tail?.[0] ?? ""), "거주지 후보");
  } else missing.push("현재 거주하는 시·도는 어디인가요?");
  const positive = subject.replace(/(?:대학생|학생|직장인|회사원|구직자|구직|주부|은퇴자|자영업자|프리랜서|월세|장애인?|자녀|학자금대출)(?:은|는|이|가)?\s*(?:없[가-힣]*|(?:아니|아닙|아냐)[가-힣]*)/g, " ");
  const jobs: [RegExp,string][] = [[/구직|취준|취업 준비|미취업|실업|백수/,"job_seeking"],[/직장인|회사원|재직|회사에(?:도)?\s*다[니녀]|근무 중/,"employed"],[/대학생|재학|고등학생|중학생/,"student"],[/전업주부|주부|가사 전담/,"homemaker"],[/자영업|프리랜서/,"self_employed"],[/은퇴|퇴직|연금 생활/,"retired"]];
  const found = jobs.map(([re,value]) => ({ match: positive.match(re), value })).filter(x=>x.match);
  if (found.some(x=>x.value === "student") && found.some(x=>x.value === "employed")) missing.push("학생과 재직 중, 이번 혜택에서 먼저 확인할 상태를 골라 주세요.");
  else if(found[0]) set("employmentStatus",found[0].value,found[0].match![0],"현재 상태");
  else missing.push("현재 학생·재직·구직·가사돌봄·은퇴 중 어떤 상태인가요?");
  const householdText=statement.slice(0,statement.indexOf("저는")>=0?statement.indexOf("저는"):0).match(/아이를 키우는/)?.[0] ? statement : positive;
  const households: [RegExp,string][] = [[/한부모|미혼모|미혼부/,"single_parent"],[/조손가구/,"grandparent_family"],[/배우자와|부부/,"couple"],[/아이|자녀|아기|육아/,"family_with_children"],[/혼자\s*(?:(?:월세|전세)로\s*)?(?:살|사)|독거|1인 가구/,"single"],[/부모님|가족과|조부모/,"family"]];
  for (const [re,value] of households) { const m=householdText.match(re); if(m) {set("householdType",value,m[0],"가구");break;} }
  for (const [re,value] of [[/월세/,"monthly_rent"],[/전세/,"jeonse"],[/자가|내 집/,"owner"]] as [RegExp,string][]) {const m=positive.match(re);if(m){set("housingStatus",value,m[0],"주거");break;}}
  const needs: string[] = []; const needSources: string[] = [];
  for(const [re,value] of [[/거동|이동이 불편|걷기 힘|휠체어/,"mobility"],[/돌봄|간병|치매|식사 도움/,"daily_care"],[/장애/,"disability"],[/아이|자녀|아기|육아|임신|출산/,"child_care"],[/안전|응급/,"safety"]] as [RegExp,string][]){const m=positive.match(re);if(m){needs.push(value);needSources.push(m[0]);}}
  if(needs.length) set("careNeeds",needs,needSources[0],"필요");
  const money = (raw:string) => {const s=raw.replaceAll(",","");return s.includes("만") ? +(s.match(/\d+(?:\.\d+)?(?=만)/)?.[0]??0)*10000 + +(s.match(/\d+(?=천)/)?.[0]??0)*1000 : Number(s);};
  const income=subject.match(/(?:연봉|연\s*소득)[은는이\s]*(\d[\d,]*(?:\.\d+)?(?:만(?:\d+천)?)?)(?:원)?/);
  if(income) set("annualIncome",money(income[1])/10000,income[0],"연 소득(만원)");
  const transit=subject.match(/교통비[은는이\s]*(\d[\d,]*(?:\.\d+)?(?:만(?:\d+천)?)?)(?:원)?/);
  if(transit) set("monthlyTransitCost",money(transit[1]),transit[0],"월 교통비(원)");
  const loan=subject.match(/학자금대출(?:은|이|는)?\s*(?:없[가-힣]*|있[가-힣]*)/);
  if(loan) set("hasStudentLoan",!loan[0].includes("없"),loan[0],"학자금대출");
  patch.profileContext=evidence.map(e=>`${e.label}:${e.value}`);
  return { patch, evidence, missing, audienceStatus:"needs_check", nextQuestion:missing[0]??"해석한 조건을 확인하고 저장해 주세요.",summary:"원문에서 찾은 후보입니다. 수정·확인 후 저장해 주세요." };
}
