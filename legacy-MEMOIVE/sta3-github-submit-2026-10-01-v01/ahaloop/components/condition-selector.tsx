"use client";

import { useId, useRef, useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import { resetProfileConditions, selectProfileField, type ProfileData } from "@/lib/profile-model";
import { passProgress, type PassCoreField } from "@/lib/ahaloop-pass";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationConnection } from "@/components/notification-connection";
import { Progress } from "@/components/ui/progress";

type Option = readonly [string, string];
const regions = ["서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도", "경상남도", "제주특별자치도"];
const jobs: Option[] = [["student", "학생"], ["employed", "직장인"], ["job_seeking", "구직 중"], ["self_employed", "자영업·프리랜서"], ["homemaker", "가사·돌봄 전담"], ["retired", "은퇴"]];
const households: Option[] = [["single", "1인·독거"], ["couple", "부부"], ["family", "가족과 거주"], ["family_with_children", "자녀 양육"], ["single_parent", "한부모 가구"], ["grandparent_family", "조손 가구"]];
const housing: Option[] = [["monthly_rent", "월세"], ["jeonse", "전세"], ["owner", "자가"], ["family", "가족 소유 주택 거주"], ["other", "기타"]];
const life: Option[] = [["first_independence", "첫 독립"], ["job_change", "이직 준비"], ["graduation", "졸업"], ["new_child", "임신·출산·양육"], ["retirement", "은퇴·퇴직"], ["care_change", "건강·돌봄 변화"], ["none", "해당 없음"]];
const care: Option[] = [["mobility", "이동 도움"], ["daily_care", "일상 돌봄"], ["child_care", "아이 돌봄"], ["safety", "안전·응급 지원"]];
const booleanOptions: Option[] = [["yes", "예"], ["no", "아니요"]];

function Choices({ label, value, options, onChange, allowUnknown = true }: { label: string; value: string; options: Option[]; onChange: (value: string) => void; allowUnknown?: boolean }) {
  const id = useId();
  return <fieldset className="min-w-0"><legend className="mb-3 font-semibold">{label}</legend>
    <RadioGroup aria-label={label} value={value} onValueChange={onChange} className="flex flex-wrap gap-2">
      {[...options, ...(allowUnknown ? [["", "아직 선택 안 함"] as Option] : [])].map(([key, text], index) => <Label key={key} htmlFor={`${id}-${index}`} className={`min-h-11 cursor-pointer rounded-full border px-3 py-2 text-sm leading-5 transition-colors ${value === key ? "border-[#176d55] bg-[#e5fbf3] text-[#12533f]" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
        <RadioGroupItem id={`${id}-${index}`} value={key} className="size-4" />{text}
      </Label>)}
    </RadioGroup>
  </fieldset>;
}

export function ConditionSelector({ profile, saving, onSave, mode = "full", onOpenFull }: { profile: ProfileData; saving: boolean; onSave: (profile: ProfileData) => Promise<boolean>; mode?: "pass" | "full"; onOpenFull?: () => void }) {
  const [draft, setDraft] = useState(profile);
  const [tab, setTab] = useState("basic");
  const [message, setMessage] = useState("");
  const id = useId();
  const passSession = useRef("");
  const passStartedAt = useRef(0);
  const update = <K extends keyof ProfileData>(key: K, value: ProfileData[K] | undefined) => { setDraft(previous => selectProfileField(previous, key, value)); setMessage(""); };
  const known = (key: keyof ProfileData) => draft.confirmedFields.includes(key);
  const selection = (key: keyof ProfileData) => known(key) ? String(draft[key] ?? "") : "";
  const booleanSelection = (key: "kpassRegistered" | "hasStudentLoan") => known(key) ? (draft[key] ? "yes" : "no") : "";
  const labelFor = (options: Option[], value: string) => options.find(([key]) => key === value)?.[1] ?? value;
  const chips: { key: keyof ProfileData; text: string }[] = [];
  if (known("region") && draft.region) chips.push({ key: "region", text: draft.region });
  if (known("age") && draft.age !== null) chips.push({ key: "age", text: `만 ${draft.age}세` });
  for (const [key, label, options] of [["employmentStatus", "생활", jobs], ["householdType", "가구", households], ["housingStatus", "주거", housing], ["lifeEvent", "변화", life]] as const) {
    if (known(key) && draft[key]) chips.push({ key, text: `${label} · ${labelFor(options, draft[key])}` });
  }
  if (known("careNeeds") && draft.careNeeds.length) chips.push({ key: "careNeeds", text: draft.careNeeds.map(value => labelFor(care, value)).join(" · ") });
  for (const [key, label, unit] of [["annualIncome", "연 소득", "만원"], ["monthlyTransitCost", "월 교통비", "원"], ["transitTrips", "월 이용", "회"]] as const) if (known(key)) chips.push({ key, text: `${label} ${draft[key].toLocaleString()}${unit}` });
  for (const [key, label] of [["kpassRegistered", "K-패스 등록"], ["hasStudentLoan", "학자금 대출"]] as const) if (known(key)) chips.push({ key, text: `${label} · ${draft[key] ? "예" : "아니요"}` });

  const pass = passProgress(draft);
  const savedPass = passProgress(profile);
  const recordPass = async (eventType: string, values: Record<string, unknown> = {}) => {
    try {
      await fetch("/api/pass-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, sessionId: passSession.current, ...values }) });
    } catch {
      // 측정 실패가 혜택 탐색을 막지 않게 합니다.
    }
  };
  const choosePass = async <K extends PassCoreField>(key: K, value: ProfileData[K]) => {
    if (!passSession.current) {
      passSession.current = crypto.randomUUID();
      sessionStorage.setItem("ahaloop-pass-session", passSession.current);
    }
    if (!passStartedAt.current) {
      passStartedAt.current = Date.now();
      void recordPass("pass_session_started");
    }
    const next = selectProfileField(draft, key, value);
    const nextProgress = passProgress(next);
    setDraft(next);
    setMessage("");
    void recordPass("pass_core_choice", { step: key, choiceCount: nextProgress.completed });
    if (nextProgress.isReady) {
      setMessage("세 가지 선택을 마쳤어요. 첫 혜택을 찾고 있습니다.");
      const ok = await onSave(next);
      setMessage(ok ? "첫 혜택을 열었어요. 이후에는 한 번에 한 가지만 확인할게요." : "혜택을 열지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.");
      if (ok) void recordPass("pass_first_benefit_viewed", { choiceCount: nextProgress.completed, elapsedMs: Date.now() - passStartedAt.current });
    }
  };

  if (mode === "pass") return <section aria-label="아하루프 패스 빠른 시작" className="mb-6 overflow-hidden rounded-3xl border border-[#bedfd5] bg-white shadow-sm">
    <div className="border-b border-slate-100 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold text-[#176d55]">아하루프 패스</p><h2 className="mt-2 text-2xl font-semibold [word-break:keep-all]">세 번만 고르면 첫 혜택을 보여드려요.</h2></div>
        <span className="rounded-full bg-[#e5fbf3] px-3 py-1.5 text-sm font-semibold text-[#12533f]">{pass.completed}/{pass.total} 선택</span>
      </div>
      <Progress value={pass.completed / pass.total * 100} className="mt-5 h-2 bg-slate-100 [&>div]:bg-[#1f8064]" />
      <p className="mt-3 text-sm leading-6 text-slate-500">로그인·소득·서류는 먼저 요구하지 않아요. 필요한 혜택을 고른 뒤 관련 조건만 한 가지씩 확인합니다.</p>
    </div>
    <fieldset disabled={saving} className="p-5 sm:p-6">
      {!pass.isReady && <div className="space-y-5">
        <p className="text-sm font-semibold text-[#176d55]">{pass.completed + 1}번째 선택</p>
        {pass.next === "region" && <div className="space-y-3"><Label htmlFor={`${id}-pass-region`} className="text-lg">지금 사는 시·도는 어디인가요?</Label><NativeSelect autoFocus id={`${id}-pass-region`} value={selection("region")} onChange={event => event.target.value && void choosePass("region", event.target.value)} className="h-12 w-full"><NativeSelectOption value="">지역 선택</NativeSelectOption>{regions.map(region => <NativeSelectOption key={region} value={region}>{region}</NativeSelectOption>)}</NativeSelect></div>}
        {pass.next === "age" && <div className="space-y-3"><Label htmlFor={`${id}-pass-age`} className="text-lg">현재 만 나이는 몇 세인가요?</Label><NativeSelect autoFocus id={`${id}-pass-age`} value={selection("age")} onChange={event => event.target.value && void choosePass("age", Number(event.target.value))} className="h-12 w-full"><NativeSelectOption value="">만 나이 선택</NativeSelectOption>{Array.from({length:111},(_,age) => <NativeSelectOption key={age} value={age}>만 {age}세</NativeSelectOption>)}</NativeSelect></div>}
        {pass.next === "employmentStatus" && <Choices label="요즘 가장 가까운 생활 상태는 무엇인가요?" options={jobs} value={selection("employmentStatus")} onChange={value => void choosePass("employmentStatus", value)} allowUnknown={false} />}
        <p className="text-sm leading-6 text-slate-500">세 번째 선택과 동시에 혜택을 다시 계산합니다. 모르는 조건은 임의로 채우지 않아요.</p>
      </div>}
      {pass.isReady && savedPass.isReady && <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-semibold text-[#176d55]">첫 혜택이 열렸어요</p><p className="mt-2 text-sm leading-6 text-slate-600">{profile.region} · 만 {profile.age}세 · {labelFor(jobs, profile.employmentStatus)}를 시작점으로 아래 후보를 보여드려요.</p></div>
        {onOpenFull && <Button type="button" variant="outline" className="min-h-11" onClick={onOpenFull}>조건 더 확인·수정</Button>}
      </div>}
      {pass.isReady && !savedPass.isReady && <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="font-semibold text-[#176d55]">세 가지 선택을 마쳤어요</p><p className="mt-2 text-sm leading-6 text-slate-600">저장이 완료되면 첫 혜택을 열 수 있어요. 실패했을 때만 다시 시도해 주세요.</p></div>
        <Button type="button" disabled={saving} className="min-h-11" onClick={async()=>{const ok=await onSave(draft);setMessage(ok?"첫 혜택을 열었어요.":"혜택을 열지 못했어요. 로그인·연결 상태를 확인해 주세요.");if(ok)void recordPass("pass_first_benefit_viewed",{choiceCount:3,elapsedMs:passStartedAt.current?Date.now()-passStartedAt.current:0});}}>{saving?"찾는 중…":"첫 혜택 다시 열기"}</Button>
      </div>}
      {message && <p role="status" className="mt-4 rounded-xl bg-[#f2faf7] p-3 text-sm leading-6">{message}</p>}
    </fieldset>
  </section>;

  return <section aria-label="혜택 조건 선택" className="mb-6 overflow-hidden rounded-3xl border border-[#bedfd5] bg-white shadow-sm">
    <div className="border-b border-slate-100 p-5 sm:p-6">
      <p className="text-sm font-semibold text-[#176d55]">나에게 맞는 혜택 찾기</p>
      <h2 className="mt-2 text-2xl font-semibold [word-break:keep-all]">지금의 나에게 해당하는 조건을 골라주세요.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">글로 설명하지 않아도 괜찮아요. 아는 항목만 선택하고, 나머지는 나중에 채워도 돼요.</p>
    </div>
    <fieldset disabled={saving} className="min-w-0">
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-none bg-slate-50 p-2 sm:grid-cols-4 group-data-[orientation=horizontal]/tabs:h-auto">
          {[['basic','지역·나이·생활'],['home','가구·주거'],['more','추가 조건'],['notice','알림 설정']].map(([value,label]) => <TabsTrigger key={value} value={value} className="min-h-11 whitespace-normal text-sm">{label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="basic" className="space-y-6 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-3"><Label htmlFor={`${id}-region`}>거주 지역 · 시/도</Label><NativeSelect id={`${id}-region`} value={selection("region")} onChange={e => update("region",e.target.value)} className="h-11 w-full"><NativeSelectOption value="">지역 선택</NativeSelectOption>{draft.region && !regions.includes(draft.region) && <NativeSelectOption value={draft.region}>{draft.region} (기존 조건)</NativeSelectOption>}{regions.map(region => <NativeSelectOption key={region} value={region}>{region}</NativeSelectOption>)}</NativeSelect><p className="text-sm text-slate-500">시·군·구 조건은 필요한 혜택에서 별도 확인해요.</p></div>
            <div className="space-y-3"><Label htmlFor={`${id}-age`}>만 나이 · 생일 기준</Label><NativeSelect id={`${id}-age`} value={selection("age")} onChange={e => update("age",e.target.value === "" ? undefined : Number(e.target.value))} className="h-11 w-full"><NativeSelectOption value="">나이 선택</NativeSelectOption>{Array.from({length:111},(_,age) => <NativeSelectOption key={age} value={age}>만 {age}세</NativeSelectOption>)}</NativeSelect></div>
          </div>
          <Choices label="현재 주된 생활 상태" options={jobs} value={selection("employmentStatus")} onChange={value => update("employmentStatus",value)} />
          <p className="text-sm text-slate-500">학생이면서 일하고 있다면, 먼저 살펴볼 상태 하나를 골라주세요.</p>
          <Button type="button" variant="outline" onClick={() => setTab("home")} className="min-h-11">가구·주거도 선택하기</Button>
        </TabsContent>
        <TabsContent value="home" className="space-y-6 p-5 sm:p-6">
          <Choices label="가구 형태" options={households} value={selection("householdType")} onChange={value => update("householdType",value)} />
          <Choices label="주거 형태" options={housing} value={selection("housingStatus")} onChange={value => update("housingStatus",value)} />
          <fieldset><legend className="mb-3 font-semibold">필요한 도움 · 여러 개 선택 가능</legend><div className="flex flex-wrap gap-2">{care.map(([value,label]) => <Label key={value} htmlFor={`${id}-${value}`} className={`min-h-11 cursor-pointer rounded-full border px-3 py-2 text-sm ${draft.careNeeds.includes(value) ? "border-[#176d55] bg-[#e5fbf3]" : "border-slate-200"}`}><Checkbox id={`${id}-${value}`} checked={draft.careNeeds.includes(value)} onCheckedChange={checked => update("careNeeds",checked ? [...draft.careNeeds,value] : draft.careNeeds.filter(item=>item!==value))}/>{label}</Label>)}</div><p className="mt-3 text-sm text-slate-500">선택하지 않은 도움은 ‘필요 없음’으로 단정하지 않아요.</p></fieldset>
        </TabsContent>
        <TabsContent value="more" className="space-y-6 p-5 sm:p-6">
          <Choices label="최근 생활 변화" options={life} value={selection("lifeEvent")} onChange={value => update("lifeEvent",value)} />
          <Choices label="학자금 대출이 있나요?" options={booleanOptions} value={booleanSelection("hasStudentLoan")} onChange={value=>update("hasStudentLoan",value===""?undefined:value==="yes")} />
          <Choices label="K-패스 카드를 등록했나요?" options={booleanOptions} value={booleanSelection("kpassRegistered")} onChange={value=>update("kpassRegistered",value===""?undefined:value==="yes")} />
          <details className="rounded-xl border border-slate-200 p-4"><summary className="cursor-pointer font-medium">금액 계산에 필요한 숫자 입력 · 선택 사항</summary><p className="mt-3 text-sm text-slate-500">금액은 임의로 추정하지 않아요. 모르면 비워 두고, 실제로 0일 때만 0을 입력하세요.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{([["annualIncome","연 소득 (만원)",1000000],["monthlyTransitCost","월 대중교통비 (원)",10000000],["transitTrips","월 대중교통 이용 횟수",500]] as const).map(([key,label,max])=><div key={key} className="space-y-2"><Label htmlFor={`${id}-${key}`}>{label}</Label><Input id={`${id}-${key}`} type="number" min={0} max={max} step={key==="annualIncome"?0.01:1} value={known(key)?draft[key]:""} onChange={e=>update(key,e.target.value===""?undefined:Number(e.target.value))}/></div>)}</div></details>
        </TabsContent>
        <TabsContent value="notice" className="space-y-5 p-5 sm:p-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><h3 className="font-semibold">실제 알림은 아직 연결되지 않았어요</h3><p className="mt-2 text-sm leading-6">지금은 희망 채널과 동의만 저장합니다. 운영자 계정 여부와 관계없이 실제 메시지는 발송되지 않아요.</p></div>
          <Choices label="희망 알림 채널 · 아직 발송되지 않음" allowUnknown={false} value={draft.preferredChannel} options={[["kakao","카카오톡"],["sms","문자"],["email","이메일"]]} onChange={value=>update("preferredChannel",value)} />
          <div aria-live="polite" className="rounded-xl border border-slate-200 p-4 text-sm leading-6"><p className="font-semibold">{draft.preferredChannel==="kakao"?"카카오톡 연결 전":draft.preferredChannel==="sms"?"문자 연결 전":"이메일 연결 전"}</p><p className="mt-2 text-slate-600">{draft.preferredChannel==="kakao"?"알림톡 방식은 받을 전화번호 확인과 발송 서비스 연결이 필요해요. 카카오 로그인만으로 알림 수신이 완료되지는 않습니다.":draft.preferredChannel==="sms"?"받을 휴대폰 번호 확인과 문자 발송 서비스 연결이 필요해요.":"받을 이메일 주소 확인과 이메일 발송 서비스 연결이 필요해요. 사이트 로그인 주소를 알림 주소로 자동 사용하지 않습니다."}</p><p className="mt-2 text-slate-600">발송 기능을 연결하기 전에는 연락처를 수집하지 않습니다. 실제 연결 시 수신처와 동의를 다시 확인합니다.</p></div>
          <div className="space-y-2"><Label htmlFor={`${id}-name`}>화면에 표시할 이름</Label><Input id={`${id}-name`} maxLength={40} value={draft.name} onChange={e=>update("name",e.target.value)} /></div>
          <Label htmlFor={`${id}-consent`} className="min-h-11 items-start rounded-xl bg-[#f2faf7] p-4 leading-6"><Checkbox id={`${id}-consent`} checked={draft.consent} onCheckedChange={value=>update("consent",value===true)} className="mt-1"/>혜택 조건 변화 알림 수신에 동의합니다. (선택)</Label>
          <p className="text-sm leading-6 text-slate-500">동의하지 않아도 혜택을 볼 수 있어요. 동의를 저장해도 알림이 켜지는 것은 아닙니다.</p>
          <NotificationConnection />
        </TabsContent>
      </Tabs>
      <div className="border-t border-[#dcece7] bg-[#f4fbf8] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">선택한 조건 <span className="text-[#176d55]">{chips.length}</span></h3><Button type="button" variant="ghost" className="min-h-11 text-slate-600" onClick={()=>{setDraft(resetProfileConditions(draft));setMessage("혜택 조건 선택을 비웠어요. 저장 전까지 기존 조건은 유지됩니다.");}}><RotateCcw className="size-4"/>조건 초기화</Button></div>
        <div className="mt-2 flex flex-wrap gap-2">{chips.length ? chips.map(chip=><Button key={chip.key} type="button" variant="outline" aria-label={`${chip.text} 선택 해제`} className="h-auto min-h-11 max-w-full whitespace-normal rounded-full border-[#a7d7c7] bg-white text-left text-sm text-[#176d55]" onClick={()=>update(chip.key,undefined)}>{chip.text}<X className="size-3 shrink-0"/></Button>) : <p className="text-sm text-slate-500">아직 선택한 조건이 없어요. 위에서 골라주세요.</p>}</div>
        <p className="mt-4 text-sm leading-6 text-slate-500">버튼을 누르면 선택한 조건을 저장하고 혜택을 다시 찾아요. 모르는 조건은 ‘정보 필요’로 남겨둡니다.</p>
        <Button type="button" disabled={saving} className="mt-4 min-h-12 w-full sm:w-auto" onClick={async()=>{setMessage(""); const ok=await onSave(draft);setMessage(ok?"조건과 희망 채널을 저장했어요. 실제 알림은 아직 연결 전입니다.":"저장하지 못했어요. 로그인·입력값·연결 상태를 확인하고 다시 시도해 주세요.");}}><Check className="size-4"/>{saving?"저장하고 찾는 중…":"선택한 조건으로 혜택 보기"}</Button>
        {message && <p role="status" className="mt-3 text-sm leading-6">{message}</p>}
      </div>
    </fieldset>
  </section>;
}
