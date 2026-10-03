"use client";

import Image from "next/image";
import { emptyProfile, type ProfileData } from "@/lib/profile-model";
import { BenefitValueSummary } from "@/components/benefit-value-summary";
import { PortfolioWorkspace } from "@/components/portfolio-workspace";
import { ConditionSelector } from "@/components/condition-selector";
import { AccountDataControl } from "@/components/account-data-control";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpRight,
  BellRing,
  BarChart3,
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  FileCheck2,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  WalletCards,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  type Benefit,
} from "@/lib/benefit-catalog";
import { activeBenefitQuestion } from "@/lib/ahaloop-pass";

type View = "brief" | "applications" | "profile" | "delivery" | "sources" | "performance" | "portfolio";
type Application = {
  application_id: string;
  benefit_id: string;
  stage: string;
  eligibility_status: string;
  expected_value: number;
  detail?: string;
  updated_at: string;
};
type Profile = ProfileData;
type Interpretation = {
  patch: Partial<Profile>;
  evidence: {
    label: string;
    value: string;
    source: string;
    confidence: number;
  }[];
  missing: string[];
  audienceStatus: "ready" | "needs_check";
  nextQuestion: string;
  summary: string;
};
type ApiResult = Interpretation & {error?:string; benefits?:Benefit[]; applications?:Application[]; profile?:Profile};
type Dashboard = {
  scope: string;
  live: {
    targetProfiles: number;
    prepared: number;
    submitted: number;
    received: number;
    receivedValue: number;
  };
  segments: { employment_status: string; count: number }[];
  events: { event_type: string; count: number }[];
  pass: { sessions: number; firstBenefitViews: number; avgChoices: number | null; avgElapsedMs: number | null; questionViews: number };
};
type SourceDashboard = {
  sources: {
    id: string;
    name: string;
    owner: string;
    coverage: string;
    url: string;
    method: "open_api" | "official_page";
    connection: "key_required" | "api_configured" | "monitor_ready" | "manual_verified";
    statusLabel: string;
    setupNote?: string;
    priority: "P0" | "P1" | "P2";
    checkEveryMinutes: number;
    freshnessSlaMinutes: number;
  }[];
  summary: { total: number; apiCandidates: number; keysRequired: number; automatedNow: number; urgentBenefits: number };
  speedPolicy: { discoverSlaMinutes: number; verifySlaMinutes: number; notifySlaMinutes: number; rule: string };
};
type SessionInfo={
  role:"operator"|"customer";
  retention:{notificationAttemptsDays:number;activityDays:number;operationsHealthDays:number;followupDays:number;accountRecords:string;enforcement:string};
};

const initialProfile: Profile = emptyProfile;
const won = new Intl.NumberFormat("ko-KR");
const stageLabels: Record<string, string> = {
  watching: "조건 변화 감시",
  checking: "조건 확인",
  documents: "서류 준비",
  submitted: "신청 완료",
  approved: "승인",
  received: "수령 완료",
};
const nav: { id: View; label: string }[] = [
  { id: "brief", label: "혜택 브리프" },
  { id: "applications", label: "내 신청함" },
  { id: "profile", label: "내 조건" },
  { id: "delivery", label: "수신 화면" },
  { id: "sources", label: "혜택 레이더" },
  { id: "performance", label: "운영·성과" },
  { id: "portfolio", label: "검증실" },
];
const operatorViews=new Set<View>(["sources","performance","portfolio"]);

export default function Page() {
  const [view, setView] = useState<View>("brief");
  const [catalog, setCatalog] = useState<Benefit[]>([]);
  const [catalogState, setCatalogState] = useState<"loading"|"ready"|"error">("loading");
  const [applications, setApplications] = useState<Application[]>([]);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [selected, setSelected] = useState<Benefit | null>(null);
  const [progressBenefit, setProgressBenefit] = useState<Benefit | null>(null);
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [externalConfirmed, setExternalConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [sourceDashboard, setSourceDashboard] = useState<SourceDashboard | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);

  const loadData = useCallback(async () => {
    setCatalogState("loading");
    try {
    const [benefitResponse, profileResponse, dashboardResponse, sourceResponse, sessionResponse] =
      await Promise.all([
        fetch("/api/benefits", { cache: "no-store" }),
        fetch("/api/profile", { cache: "no-store" }),
        fetch("/api/benefit-dashboard", { cache: "no-store" }),
        fetch("/api/benefit-sources", { cache: "no-store" }),
        fetch("/api/session", { cache: "no-store" }),
      ]);
    if (benefitResponse.ok) {
      const data = await benefitResponse.json() as ApiResult;
      setCatalog(data.benefits ?? []);
      setApplications(data.applications ?? []);
      setCatalogState("ready");
    } else { setCatalogState("error"); setCatalog([]); setNotice("혜택을 불러오지 못했습니다. 로그인·연결 상태를 확인해 주세요."); }
    if (profileResponse.ok) {
      const data = await profileResponse.json() as ApiResult;
      setProfile({ ...initialProfile, ...data.profile });
    }
    if (dashboardResponse.ok) setDashboard(await dashboardResponse.json());
    if (sourceResponse.ok) setSourceDashboard(await sourceResponse.json());
    if (sessionResponse.ok) setSession(await sessionResponse.json());
    } catch { setCatalogState("error"); setCatalog([]); setNotice("연결이 끊겼습니다. 다시 시도해 주세요."); }
  }, []);

  const visibleNav=nav.filter((item)=>!operatorViews.has(item.id)||session?.role==="operator");

  useEffect(() => {
    queueMicrotask(() => loadData().catch(() => setNotice("연결이 끊겼습니다. 다시 시도해 주세요.")));
  }, [loadData]);
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool(
        {
          name: "ahaloop_read_benefits",
          title: "아하루프 혜택 상태 조회",
          description:
            "현재 사용자의 혜택 판정과 준비·신청 진행 상태를 조회합니다.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          async execute() {
            const response = await fetch("/api/benefits", {
              cache: "no-store",
            });
            if (!response.ok)
              throw new Error("혜택 상태를 조회하지 못했습니다.");
            return response.json();
          },
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: "ahaloop_interpret_profile",
          title: "아하루프 생활 조건 이해",
          description:
            "누구나 자연어로 설명한 현재 생활에서 혜택 판정 조건과 다음 질문을 추출합니다. 저장은 하지 않습니다.",
          inputSchema: {
            type: "object",
            properties: {
              statement: { type: "string", minLength: 5, maxLength: 500 },
            },
            required: ["statement"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          async execute(input) {
            const response = await fetch("/api/profile-interpret", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            const result = await response.json() as ApiResult;
            if (!response.ok)
              throw new Error(
                result.error ?? "생활 조건을 이해하지 못했습니다.",
              );
            return result;
          },
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: "ahaloop_start_benefit",
          title: "아하루프 혜택 준비 시작",
          description:
            "선택한 혜택의 준비를 시작하거나 조건 변화를 감시합니다.",
          inputSchema: {
            type: "object",
            properties: {
              benefitId: { type: "string" },
              action: { type: "string", enum: ["start", "watch"] },
            },
            required: ["benefitId", "action"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            const response = await fetch("/api/benefit-action", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            const result = await response.json() as ApiResult;
            if (!response.ok)
              throw new Error(
                result.error ?? "혜택 진행 상태를 저장하지 못했습니다.",
              );
            await loadData();
            return result;
          },
        },
        { signal: lifecycle.signal },
      );
    };
    register().catch(console.error);
    return () => lifecycle.abort();
  }, [loadData]);

  const action = async (
    benefit: Benefit,
    requested?: "start" | "watch" | "advance",
  ) => {
    if (!requested && applications.some(a=>a.benefit_id===benefit.id)) {setView("applications"); return;}
    setSaving(true);
    setNotice("");
    const actionType =
      requested ?? (benefit.status === "watch" ? "watch" : "start");
    try {
      const response = await fetch("/api/benefit-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benefitId: benefit.id, action: actionType, fromStage: applications.find(a=>a.benefit_id===benefit.id)?.stage }),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok) throw new Error(result.error);
      await loadData();
      setSelected(null);
      setNotice(
        actionType === "watch"
          ? "조건 변화 감시를 시작했어요."
          : "신청함에 담고 조건 확인을 시작했어요.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async (nextProfile: Profile): Promise<boolean> => {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok) throw new Error(result.error);
      await loadData();
      setNotice("조건과 희망 채널을 저장했어요. 실제 알림은 아직 연결 전입니다.");
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "저장하지 못했습니다.");
      return false;
    } finally { setSaving(false); }
  };

  const recordPass = (eventType: string, benefit?: Benefit) => {
    let sessionId = sessionStorage.getItem("ahaloop-pass-session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("ahaloop-pass-session", sessionId);
    }
    void fetch("/api/pass-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType, sessionId, benefitId: benefit?.id }) }).catch(() => undefined);
  };

  const openBenefit = (benefit: Benefit) => {
    setSelected(benefit);
    if (activeBenefitQuestion(benefit)) recordPass("pass_next_question_viewed", benefit);
  };

  return (
    <main className="min-h-screen bg-[#f3f6fa] text-[#13213a]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-9">
          <button
            onClick={() => setView("brief")}
            className="flex items-center gap-3 text-left"
          >
            <Image
              src="/brand/ahaloop-mascot-profile.png"
              alt="아하루프 마스코트 아루"
              width={44}
              height={44}
              className="size-11 rounded-2xl object-cover"
              priority
            />
            <span>
              <span className="block text-xs font-bold tracking-[0.16em] text-[#176d55]">
                AHALOOP
              </span>
              <span className="font-semibold">놓친 혜택을 받을 때까지</span>
            </span>
          </button>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 md:order-2 md:w-auto">
            {visibleNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${view === item.id ? "bg-white text-[#176d55] shadow-sm" : "text-slate-500"}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <Badge
            variant="outline"
            className="order-2 border-[#b6dfd2] bg-[#edfaf5] text-[#176d55] md:order-3"
          >
            {session?.role==="operator"?"운영자 보기 · 파일럿":"전국 · 전 생애주기"}
          </Badge>
        </div>
      </header>
      {notice && (
        <div className="mx-auto mt-5 max-w-[1370px] px-5 md:px-9">
          <div
            role="status"
            className="rounded-2xl border border-[#b6dfd2] bg-[#edfaf5] px-4 py-3 text-sm font-medium text-[#176d55]"
          >
            {notice}
            {notice.includes("로그인") && <a className="ml-3 underline" href="/signin-with-chatgpt?return_to=/" target="_top">로그인하기</a>}
          </div>
        </div>
      )}
      {view === "brief" && (
        <BriefView
          profile={profile}
          saving={saving}
          catalog={catalog}
          catalogState={catalogState}
          onRetry={() => void loadData()}
          applications={applications}
          onSaveProfile={saveProfile}
          onSelect={openBenefit}
          onAction={action}
          onNavigate={setView}
        />
      )}
      {view === "applications" && (
        <ApplicationsView
          applications={applications}
          catalog={catalog}
          onAdvance={(benefit) => {setProgressBenefit(benefit);setExternalConfirmed(false);setReceiptAmount("");setReceiptDate("");}}
        />
      )}
      {view === "profile" && (
        <div className="mx-auto max-w-5xl px-5 py-9 md:px-9">
          <ConditionSelector key={JSON.stringify(profile)} profile={profile} saving={saving} onSave={saveProfile} />
          <AccountDataControl retention={session?.retention??null} onDeleted={()=>void loadData()} />
        </div>
      )}
      {view === "delivery" && (
        <DeliveryView
          profile={profile}
          catalog={catalog}
          onGo={() => setView("brief")}
        />
      )}
      {view === "sources" && session?.role==="operator" && <SourceRadar dashboard={sourceDashboard} />}
      {view === "performance" && session?.role==="operator" && <PerformanceView dashboard={dashboard} />}
      {view === "portfolio" && session?.role==="operator" && <PortfolioWorkspace />}
      <Dialog open={!!progressBenefit} onOpenChange={open=>{if(!open)setProgressBenefit(null);}}><DialogContent><DialogHeader><DialogTitle>외부 진행 사실 기록</DialogTitle><DialogDescription>이 화면은 기관에 신청을 제출하거나 승인을 확인하지 않습니다. 직접 진행한 사실만 기록하세요.</DialogDescription></DialogHeader>
      {progressBenefit && <><p>{progressBenefit.title}</p><p>현재: {stageLabels[applications.find(a=>a.benefit_id===progressBenefit.id)?.stage??"checking"]}</p>
      {applications.find(a=>a.benefit_id===progressBenefit.id)?.stage==="approved"&&<><Label htmlFor="receipt-date">실제 수령·이용일</Label><Input id="receipt-date" type="date" value={receiptDate} max={new Date().toISOString().slice(0,10)} onChange={e=>setReceiptDate(e.target.value)}/>{progressBenefit.valueCadence!=="non_cash"&&<><Label htmlFor="receipt-amount">실제로 받은 금액 (원)</Label><Input id="receipt-amount" type="number" min={1} value={receiptAmount} onChange={e=>setReceiptAmount(e.target.value)}/></>}</>}
      <div className="flex items-center gap-3"><Switch id="external-confirmed" checked={externalConfirmed} onCheckedChange={setExternalConfirmed}/><Label htmlFor="external-confirmed">기관에서 다음 단계를 직접 완료했습니다</Label></div>
      <Button disabled={saving||!externalConfirmed} onClick={async()=>{setSaving(true);try{const fromStage=applications.find(a=>a.benefit_id===progressBenefit.id)?.stage;const r=await fetch("/api/benefit-action",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({benefitId:progressBenefit.id,action:fromStage==="approved"?"receipt":"advance",fromStage,confirmedExternal:externalConfirmed,amount:Number(receiptAmount),receivedAt:receiptDate})});const d=await r.json() as {error?:string};if(!r.ok)throw new Error(d.error);await loadData();setProgressBenefit(null);setNotice("진행 사실을 자기보고로 저장했습니다.");}catch(e){setNotice(e instanceof Error?e.message:"저장 실패");}finally{setSaving(false);}}}>자기보고로 저장</Button></>}
      </DialogContent></Dialog>
      <BenefitDialog
        benefit={selected}
        saving={saving}
        onClose={() => setSelected(null)}
        onAction={action}
      />
    </main>
  );
}

function BriefView({
  profile,
  saving,
  catalog,
  catalogState,
  onRetry,
  applications,
  onSaveProfile,
  onSelect,
  onAction,
  onNavigate,
}: {
  profile: Profile;
  saving: boolean;
  catalog: Benefit[];
  catalogState: "loading"|"ready"|"error";
  onRetry: () => void;
  applications: Application[];
  onSaveProfile: (profile: Profile) => Promise<boolean>;
  onSelect: (benefit: Benefit) => void;
  onAction: (benefit: Benefit, action?: "start" | "watch" | "advance") => void;
  onNavigate: (view: View) => void;
}) {
  const age = profile.age;
  const employment =
    ({ employed: "재직", job_seeking: "구직 중", student: "학생", self_employed: "자영업·프리랜서", homemaker: "가사·돌봄 전담", retired: "은퇴" } as Record<string, string>)[profile.employmentStatus] ?? "상태 확인";
  return (
    <div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-6 md:px-9 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-9">
      <section className="min-w-0">
        <ConditionSelector key={JSON.stringify(profile)} profile={profile} saving={saving} onSave={onSaveProfile} mode="pass" onOpenFull={() => onNavigate("profile")} />
        <div className="overflow-hidden rounded-[2rem] bg-[#0c1b33] text-white shadow-[0_24px_70px_rgba(20,38,70,0.16)]">
          <div className="grid gap-7 p-6 sm:p-9 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] xl:items-end">
            <div>
              <Badge className="bg-[#dfff54] text-[#24320b] hover:bg-[#dfff54]">
                {profile.name}님의 이번 달 혜택 브리프
              </Badge>
              <h1 className="mt-5 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.035em] [word-break:keep-all] [text-wrap:balance] sm:text-4xl 2xl:text-5xl">
                알려드리는 데서 끝내지 않고,
                <br />
                <span className="text-[#8bf5d2]">받을 수 있게 준비했어요.</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
                {profile.region || "거주지 확인 필요"} · {age === null ? "만 나이 확인 필요" : `만 ${age}세`} · {employment} ·{" "}
                {profile.housingStatus === "monthly_rent"
                  ? "월세"
                  : profile.housingStatus === "jeonse"
                    ? "전세"
                    : "주거 확인"}{" "}
                조건을 시작점으로 전국·지역 공식 혜택을 다시 계산했습니다.
              </p>
            </div>
            <BenefitValueSummary items={catalog} state={catalogState} onSelect={onSelect} onProfile={()=>onNavigate("profile")} onRetry={onRetry}/>
          </div>
          <div className="grid border-t border-white/10 bg-white/[0.035] sm:grid-cols-3">
            <Stat label="전 생애주기 대표 혜택" value={`${catalog.length}개`} />
            <Stat
              label="바로 준비 가능"
              value={`${catalog.filter((item) => item.status === "ready").length}개`}
            />
            <Stat label="진행 중" value={`${applications.length}개`} />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {catalog.map((benefit) => (
            <BenefitCard
              key={benefit.id}
              benefit={benefit}
              application={applications.find(
                (item) => item.benefit_id === benefit.id,
              )}
              onSelect={onSelect}
              onAction={onAction}
            />
          ))}
        </div>
      </section>
      <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <section className="rounded-[1.75rem] bg-[#dfff54] p-6 text-[#17210d] shadow-[0_18px_50px_rgba(123,153,28,0.16)]">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-[#17210d] text-white">
            <Sparkles className="size-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
            가장 먼저
            <br />
            마감 임박 혜택부터 볼까요?
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#536016]">
            공식 원문에서 접수 기간을 먼저 확인하세요. 검수 후 30분 내 알림은
            운영 목표이며 실제 발송은 아직 연결되지 않았어요.
          </p>
          <Button
            onClick={() => catalog[0] && onSelect(catalog[0])}
            className="mt-6 h-12 w-full justify-between bg-[#17210d] text-white hover:bg-[#293716]"
          >
            긴급 혜택 확인
            <ChevronRight />
          </Button>
        </section>
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">혜택 회수 현황</h2>
            <WalletCards className="size-5 text-[#1f8064]" />
          </div>
          <div className="mt-5 space-y-5">
            <ProgressItem
              label="조건 확인"
              value={catalog.length ? applications.length / catalog.length * 100 : 0}
              text={`${applications.length}/${catalog.length}`}
            />
            <ProgressItem
              label="서류 준비"
              value={
                applications.some((item) => item.stage === "documents") ? 50 : 0
              }
              text={
                applications.some((item) => item.stage === "documents")
                  ? "진행 중"
                  : "대기"
              }
            />
            <ProgressItem
              label="수령 완료"
              value={
                applications.some((item) => item.stage === "received") ? 100 : 0
              }
              text={
                applications.some((item) => item.stage === "received")
                  ? "완료"
                  : "보고 없음"
              }
            />
          </div>
          <Button
            onClick={() => onNavigate("applications")}
            variant="outline"
            className="mt-6 w-full"
          >
            내 신청함 보기
          </Button>
        </section>
        <section className="rounded-[1.75rem] border border-slate-200 bg-white p-6">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#1f8064]" />
            <div>
              <h2 className="font-semibold">판정 원칙</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                금액과 가능성을 단정하지 않습니다. 공식 원문, 계산 근거, 아직
                필요한 정보를 함께 보여드려요.
              </p>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function BenefitCard({
  benefit,
  application,
  onSelect,
  onAction,
}: {
  benefit: Benefit;
  application?: Application;
  onSelect: (benefit: Benefit) => void;
  onAction: (benefit: Benefit, action?: "start" | "watch") => void;
}) {
  const nextQuestion = activeBenefitQuestion(benefit);
  const tone =
    benefit.status === "ready"
      ? "bg-[#e2faef] text-[#146047]"
      : benefit.status === "watch"
        ? "bg-slate-100 text-slate-600"
        : "bg-[#fff4d5] text-[#7b5704]";
  const label = application
    ? stageLabels[application.stage]
    : benefit.status === "ready"
      ? "준비 가능"
      : benefit.status === "watch"
        ? "조건 변화 감시"
        : "추가 확인 필요";
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 transition-shadow hover:shadow-[0_18px_50px_rgba(20,38,70,0.08)] sm:p-7">
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={tone}>{label}</Badge>
        <Badge variant="outline">{benefit.category}</Badge>
        {benefit.urgency === "urgent" && (
          <Badge className="bg-[#fff0e8] text-[#a3461d]">마감 먼저</Badge>
        )}
        {benefit.urgency === "new" && (
          <Badge className="bg-[#e9f2ff] text-[#245ea8]">새로 확장</Badge>
        )}
        <span className="ml-auto text-sm font-semibold text-[#176d55]">
          {benefit.status === "ready" ? "입력 조건 기반 · 기관 확인 필요" : "추가 조건 확인 필요"}
        </span>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div>
          <h2 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
            {benefit.title}
          </h2>
          <p className="mt-2 text-lg font-semibold text-[#1f8064]">
            {benefit.valueLabel}
          </p>
          <p className="mt-3 leading-7 text-slate-600">{benefit.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {benefit.audiences.slice(0, 4).map((audience) => (
              <span key={audience} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {audience}
              </span>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-[#f4fbf8] px-4 py-3 text-sm leading-6 text-[#285e50]">
            <strong>왜 나에게?</strong> {benefit.matchReason}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold">지금 확인할 한 가지</p>
          {nextQuestion ? <><p className="mt-3 text-sm leading-6 text-slate-700">{nextQuestion}</p>{benefit.missing.length > 1 && <p className="mt-2 text-xs leading-5 text-slate-500">나머지 {benefit.missing.length - 1}개는 이 답 뒤에 차례로 확인해요.</p>}</> : <p className="mt-3 text-sm text-[#176d55]">추가 질문 없이 준비를 시작할 수 있어요.</p>}
          <p className="mt-4 border-t border-slate-200 pt-3 text-sm">
            <strong>기한</strong> · {benefit.deadline}
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
        <Button onClick={() => nextQuestion ? onSelect(benefit) : onAction(benefit)}>
          <FileCheck2 />
          {application
            ? "준비 현황 보기"
            : benefit.status === "watch"
              ? "변경되면 알려줘"
              : nextQuestion ? "이 한 가지만 확인하기" : "준비 시작"}
        </Button>
        <Button onClick={() => nextQuestion ? onAction(benefit) : onSelect(benefit)} variant="outline">
          <ClipboardCheck />
          {nextQuestion ? "신청함에 먼저 담기" : "판정 근거"}
        </Button>
        <Button asChild variant="ghost">
          <a href={benefit.sourceUrl} target="_blank" rel="noreferrer">
            공식 원문 <ArrowUpRight />
          </a>
        </Button>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
        <Check className="size-3.5" />
        {benefit.provider} 공식 원문 · {benefit.sourceCheckedAt} 확인 · {benefit.freshnessLabel}
      </p>
    </article>
  );
}

function BenefitDialog({
  benefit,
  saving,
  onClose,
  onAction,
}: {
  benefit: Benefit | null;
  saving: boolean;
  onClose: () => void;
  onAction: (benefit: Benefit) => void;
}) {
  return (
    <Dialog open={Boolean(benefit)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{benefit?.title}</DialogTitle>
          <DialogDescription>
            아하루프가 판정에 사용한 조건과 아직 확인할 정보를 분리해
            보여드려요.
          </DialogDescription>
        </DialogHeader>
        {benefit && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#edf9f5] p-4">
              <p className="font-semibold text-[#176d55]">금액 계산 근거</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {benefit.amountBasis}
              </p>
            </div>
            <div>
              <p className="font-semibold">공식 대상 조건 (충족 여부와 별개)</p>
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {benefit.eligibility.map((item) => (
                  <li key={item} className="flex gap-2">
                    <Check className="mt-0.5 size-4 text-[#1f8064]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">아하, 다음 한 가지만 확인할게요</p>
              <p className="mt-2 text-sm text-emerald-800">일치: {benefit.matched?.join(" · ") || "아직 확인된 조건 없음"}</p>
              <p className="mt-2 text-sm text-red-700">불일치: {benefit.failed?.join(" · ") || "확인된 불일치 없음 (대상 확정 아님)"}</p>
              <p className="mt-2 text-sm text-slate-500">규칙: {benefit.ruleVersion} · {benefit.eligibilityStatus==="closed" ? "해당 회차 모집 종료" : "공식 기관 최종 확인 필요"}</p>
              {activeBenefitQuestion(benefit) ? <div className="mt-3 rounded-xl border border-[#bedfd5] bg-[#f4fbf8] px-4 py-4 text-sm font-medium text-[#285e50]">{activeBenefitQuestion(benefit)}</div> : <p className="mt-3 text-sm text-[#176d55]">추가로 답할 조건 없이 준비를 시작할 수 있어요.</p>}
              {benefit.missing.length > 1 && <p className="mt-2 text-sm text-slate-500">한 화면에는 한 가지 결정만 보여드립니다. 다음 조건은 이 단계를 마친 뒤 이어집니다.</p>}
            </div>
            <Button
              disabled={saving}
              onClick={() => onAction(benefit)}
              className="w-full"
            >
              {saving
                ? "저장 중…"
                : benefit.status === "watch"
                  ? "조건 변화 감시 시작"
                  : "내 신청함에 담기"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ApplicationsView({
  applications,
  catalog,
  onAdvance,
}: {
  applications: Application[];
  catalog: Benefit[];
  onAdvance: (benefit: Benefit, action: "advance") => void;
}) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-9 md:px-9">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Badge className="bg-[#e2faef] text-[#146047]">내 신청함</Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            발견이 아니라 수령까지 관리해요.
          </h1>
          <p className="mt-2 text-slate-500">
            조건 확인, 서류 준비, 신청, 승인, 수령 상태를 한곳에서 이어갑니다.
          </p>
        </div>
        <CircleDollarSign className="hidden size-12 text-[#1f8064] sm:block" />
      </div>
      {applications.length === 0 ? (
        <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white p-10 text-center">
          <ClipboardCheck className="mx-auto size-10 text-slate-300" />
          <h2 className="mt-4 text-xl font-semibold">
            아직 준비 중인 혜택이 없어요.
          </h2>
          <p className="mt-2 text-slate-500">
            혜택 브리프에서 하나를 골라 ‘준비 시작’을 눌러보세요.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {applications.map((application) => {
            const benefit = catalog.find(
              (item) => item.id === application.benefit_id,
            );
            if (!benefit) return null;
            const progress =
              application.stage === "watching"
                ? 10
                : Math.max(
                    20,
                    ([
                      "checking",
                      "documents",
                      "submitted",
                      "approved",
                      "received",
                    ].indexOf(application.stage) +
                      1) *
                      20,
                  );
            const nextAction=application.stage==="checking"
              ? benefit.preparationSteps?.[0]??"공식 원문에서 세부 조건 확인"
              : application.stage==="documents"
                ? benefit.preparationSteps?.[1]??"필요 서류와 신청 방법 확인"
                : application.stage==="submitted"
                  ? "기관 접수 상태와 보완 요청 확인"
                  : application.stage==="approved"
                    ? "실제 수령·이용일을 확인해 기록"
                    : application.stage==="received"
                      ? "수령 기록 완료"
                      : "다음 모집 공고가 열리는지 감시";
            return (
              <article
                key={application.application_id}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge variant="outline">
                      {stageLabels[application.stage]}
                    </Badge>
                    <h2 className="mt-3 text-xl font-semibold">
                      {benefit.title}
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      예상 가치{" "}
                      {application.expected_value
                        ? `${won.format(application.expected_value)}원`
                        : benefit.valueLabel}
                    </p>
                  </div>
                  {application.stage !== "watching" &&
                    application.stage !== "received" && (
                      <Button onClick={() => onAdvance(benefit, "advance")}>
                        다음 단계로 <ChevronRight />
                      </Button>
                    )}
                </div>
                <Progress
                  value={progress}
                  className="mt-6 h-2 [&>div]:bg-[#1f8064]"
                />
                <div className="mt-3 flex justify-between text-xs text-slate-400">
                  <span>조건 확인</span>
                  <span>서류</span>
                  <span>신청</span>
                  <span>승인</span>
                  <span>수령</span>
                </div>
                <div className="mt-5 rounded-2xl border border-[#bedfd5] bg-[#f4fbf8] p-4">
                  <p className="text-sm font-semibold text-[#176d55]">지금 할 일 하나</p>
                  <p className="mt-2 leading-7 text-slate-800">{nextAction}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button asChild variant="outline"><a href={benefit.sourceUrl} target="_blank" rel="noreferrer">{benefit.applicationCta??"공식 원문 확인"}<ArrowUpRight aria-hidden="true"/></a></Button>
                    {benefit.preparationSteps&&<details className="w-full text-sm text-slate-600"><summary className="cursor-pointer py-2 font-medium">전체 준비 순서 보기</summary><ol className="list-inside list-decimal space-y-2 pt-2">{benefit.preparationSteps.map(step=><li key={step}>{step}</li>)}</ol></details>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DeliveryView({
  profile,
  catalog,
  onGo,
}: {
  profile: Profile;
  catalog: Benefit[];
  onGo: () => void;
}) {
  const transitBenefit = catalog.find(
    (benefit) => benefit.id === "kpass-youth-2026",
  );
  const [messageType, setMessageType] = useState<
    "discovery" | "deadline" | "progress"
  >("discovery");
  const message = {
    discovery: {
      badge: "새로 찾았어요",
      title: `${profile.name}님 조건으로 받을 가능성이 높은 혜택이 열렸어요.`,
      value: `월 ${won.format(transitBenefit?.estimatedValue ?? 0)}원 예상`,
      reason: `${profile.region} 거주 · 저장한 연령·교통 조건을 바탕으로 찾았어요.`,
      question: "지난달 대중교통을 15회 이상 이용했나요?",
      cta: "한 가지만 답하고 확인하기",
      id: "notification-discovery",
    },
    deadline: {
      badge: "마감 3일 전",
      title: "저장한 혜택, 지금 준비하면 마감 전에 신청할 수 있어요.",
      value: "1회 25,000원 예시",
      reason: "응시 예정 자격시험과 연령 조건이 맞고, 소득 확인이 남았어요.",
      question: "응시 확인서를 지금 준비할까요?",
      cta: "준비 이어가기",
      id: "notification-deadline",
    },
    progress: {
      badge: "수령까지 한 단계",
      title: "신청 상태를 확인할 때예요. 아하루프가 끝까지 이어볼게요.",
      value: "신청 완료 · 지급 확인 전",
      reason: "3일 전 신청 완료로 표시했고 아직 수령 확인이 없어요.",
      question: "기관에서 승인 또는 보완 문자를 받았나요?",
      cta: "진행 상태 알려주기",
      id: "notification-progress",
    },
  }[messageType];

  const openBrief = async () => {
    await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "preview_action",
        contentId: message.id,
        detail: messageType,
      }),
    }).catch(() => undefined);
    onGo();
  };
  const chooseMessage = async (
    nextType: "discovery" | "deadline" | "progress",
  ) => {
    setMessageType(nextType);
    await fetch("/api/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "preview_open",
        contentId: `notification-${nextType}`,
        detail: nextType,
      }),
    }).catch(() => undefined);
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-9 md:px-9">
      <div className="grid gap-8 md:grid-cols-[1fr_390px]">
       <div>
        <Badge className="bg-[#e2faef] text-[#146047]">고객 수신 화면</Badge>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          문자는 짧게, 다음 행동은 선명하게.
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-slate-500">
          고객은 뉴스 목록이 아니라 예상 가치, 받은 이유, 마감과 지금 답할 질문
          하나를 받습니다. 아래 유형을 눌러 실제 수신 흐름을 비교해 보세요.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {([
            ["discovery", "새 혜택"],
            ["deadline", "마감 임박"],
            ["progress", "진행 이어가기"],
          ] as const).map(([id, label]) => (
            <Button
              key={id}
              variant={messageType === id ? "default" : "outline"}
              onClick={() => chooseMessage(id)}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="mt-8 space-y-4">
          <MiniFeature
            icon={<CircleDollarSign />}
            title="결과부터"
            text="몇 개를 찾았는지보다 얼마를 회수할 수 있는지 먼저 보여줘요."
          />
          <MiniFeature
            icon={<Settings2 />}
            title="한 번에 한 질문"
            text="판정에 꼭 필요한 정보만 묻고 답에 따라 다음 단계를 엽니다."
          />
          <MiniFeature
            icon={<BellRing />}
            title="변화가 있을 때만"
            text="매주 억지로 보내지 않고 새 자격·마감·보완 요청이 생길 때 알려요."
          />
        </div>
       </div>
      <div className="rounded-[2.4rem] border-[8px] border-[#1d2430] bg-[#b9d6e4] p-4 shadow-2xl">
        <div className="rounded-3xl bg-white p-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/ahaloop-mascot-profile.png"
              alt="아루"
              width={42}
              height={42}
              className="rounded-2xl"
            />
            <div>
              <p className="font-semibold">아하루프 혜택알림</p>
              <p className="text-xs text-slate-400">오늘 오전 9:00</p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[#fee500] p-4 text-[#241f00]">
            <Badge className="bg-white/80 text-[#241f00]">{message.badge}</Badge>
            <p className="mt-3 text-sm font-semibold">아하루프, 놓치지 않게 이어드릴게요.</p>
            <h2 className="mt-3 text-xl font-bold leading-7">{message.title}</h2>
            <p className="mt-3 text-lg font-bold">{message.value}</p>
            <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm leading-6">
              <strong>왜 받았나요?</strong><br />{message.reason}
            </div>
            <div className="mt-4 rounded-xl bg-white/80 p-3 text-sm">
              <strong>{profile.name}님께 질문 1개</strong>
              <br />
              {message.question}
            </div>
            <Button onClick={openBrief} className="mt-4 w-full bg-[#17210d]">
              {message.cta}
            </Button>
            <p className="mt-3 text-xs leading-5 opacity-70">공식 원문 확인 · 2026.09.14<br />선정·지급을 보장하지 않습니다.</p>
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            수신 동의 · 언제든 알림 끄기
          </p>
        </div>
      </div>
      </div>
      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
        <h2 className="text-xl font-semibold">아하루프 알림 운영 원칙</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["관련성", "내 조건이 맞거나 확인할 조건이 하나 남았을 때만"],
            ["긴급성", "마감·조건 변경·안전 혜택을 먼저"],
            ["행동성", "한 알림에는 질문 또는 다음 행동 하나만"],
            ["절제", "같은 혜택 중복 발송을 막고 광고는 별도 표시"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl bg-slate-50 p-4">
              <strong>{title}</strong><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SourceRadar({ dashboard }: { dashboard: SourceDashboard | null }) {
  const statusTone: Record<string, string> = {
    key_required: "border-[#f0cc83] bg-[#fff8e8] text-[#76540a]",
    api_configured: "border-[#9fd1c2] bg-[#f2faf7] text-[#176d55]",
    monitor_ready: "border-[#9fd1c2] bg-[#f2faf7] text-[#176d55]",
    manual_verified: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return (
    <div className="mx-auto max-w-6xl px-5 py-9 md:px-9">
      <Badge className="bg-[#dfff54] text-[#24320b]">혜택 레이더</Badge>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">많이 찾고, 늦기 전에 먼저 올립니다.</h1>
          <p className="mt-2 max-w-3xl leading-7 text-slate-500">보조금24·복지로를 전국 기본망으로 두고 청년·고용·장학·세제·돌봄 전문 출처를 겹쳐 확인합니다. 아래 상태는 실제 연결 상태와 설계 상태를 구분합니다.</p>
        </div>
        <div className="rounded-2xl bg-[#0c1b33] px-5 py-4 text-white">
          <p className="text-sm text-slate-300">현재 자동 수집</p>
          <p className="mt-1 text-2xl font-semibold text-[#dfff54]">{dashboard?.summary.automatedNow ?? 0}개</p>
          <p className="mt-1 text-xs text-slate-400">인증키 연결 전에는 자동 수집으로 표시하지 않아요</p>
        </div>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="등록한 출처 묶음" value={dashboard ? `${dashboard.summary.total}묶음` : "확인 중"} />
        <Stat label="Open API 후보 묶음" value={dashboard ? `${dashboard.summary.apiCandidates}묶음` : "확인 중"} />
        <Stat label="7일 이내 마감 후보" value={dashboard ? `${dashboard.summary.urgentBenefits}개` : "확인 중"} />
      </section>
      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3"><Clock3 className="size-5 text-[#176d55]" /><h2 className="text-xl font-semibold">운영 목표 · 실제 소요 시간은 미측정</h2></div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">새 공고 발견</p><strong className="mt-2 block text-2xl">{dashboard?.speedPolicy.discoverSlaMinutes ?? 60}분 이내</strong></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="text-sm text-slate-500">조건·기한 검수</p><strong className="mt-2 block text-2xl">{dashboard?.speedPolicy.verifySlaMinutes ?? 180}분 이내</strong></div>
          <div className="rounded-2xl bg-[#e2faef] p-4"><p className="text-sm text-[#176d55]">검수 후 대상자 알림</p><strong className="mt-2 block text-2xl text-[#176d55]">{dashboard?.speedPolicy.notifySlaMinutes ?? 30}분 이내</strong></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">{dashboard?.speedPolicy.rule}</p>
      </section>
      <section className="mt-6 space-y-4">
        {(dashboard?.sources ?? []).map((source) => (
          <article key={source.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e2faef] text-[#176d55]"><Database className="size-5" /></div><div><h2 className="font-semibold">{source.name}</h2><p className="mt-1 text-sm text-slate-500">{source.owner} · {source.coverage}</p></div></div>
              <div className="flex flex-wrap gap-2"><Badge variant="outline">{source.priority}</Badge><Badge variant="outline" className={statusTone[source.connection]}>{source.statusLabel}</Badge></div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-500">
              <span>수집 방식 · {source.method === "open_api" ? "공식 Open API" : "공식 원문 변경 감시"}</span><span>목표 확인 주기 · {source.checkEveryMinutes < 60 ? `${source.checkEveryMinutes}분` : `${source.checkEveryMinutes / 60}시간`}</span>
              <Button asChild variant="ghost" size="sm" className="ml-auto"><a href={source.url} target="_blank" rel="noreferrer">공식 제공처 <ArrowUpRight /></a></Button>
            </div>
            {source.setupNote && <p className="mt-3 text-sm font-medium text-[#176d55]">{source.setupNote}</p>}
          </article>
        ))}
      </section>
      <div className="mt-6 rounded-2xl border border-[#f0cc83] bg-[#fff8e8] p-5 text-sm leading-6 text-[#76540a]"><strong>현재 상태:</strong> 대표 혜택 11건은 공식 원문을 확인해 연결했습니다. 보조금24·온통청년·지자체 Open API는 인증키 발급 전이므로 자동 수집 중이라고 표시하지 않습니다.</div>
    </div>
  );
}

function PerformanceView({ dashboard }: { dashboard: Dashboard | null }) {
  const notificationActions =
    dashboard?.events.find(
      (event) => event.event_type === "preview_action",
    )?.count ?? 0;
  const funnel = [
    {
      label: "타깃 조건 확인",
      value: dashboard?.live.targetProfiles ?? 0,
      definition: "거주지·연령·생활단계·가구 맥락",
    },
    {
      label: "준비 시작",
      value: dashboard?.live.prepared ?? 0,
      definition: "혜택을 신청함에 담음",
    },
    {
      label: "신청 완료",
      value: dashboard?.live.submitted ?? 0,
      definition: "외부 신청을 제출함",
    },
    {
      label: "수령 완료",
      value: dashboard?.live.received ?? 0,
      definition: "지급·할인을 확인함",
    },
  ];
  const base = Math.max(funnel[0].value, 1);
  const passActivation = dashboard?.pass.sessions
    ? Math.round((dashboard.pass.firstBenefitViews / dashboard.pass.sessions) * 100)
    : null;
  return (
    <div className="mx-auto max-w-6xl px-5 py-9 md:px-9">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <Badge className="bg-[#dfff54] text-[#24320b]">
            제품 의사결정 보드
          </Badge>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            혜택을 찾았는지가 아니라, 받았는지를 봅니다.
          </h1>
          <p className="mt-2 max-w-2xl leading-7 text-slate-500">
            대상 고객, 판정 근거, CRM 이벤트와 실험이 하나의 지표로 연결되는지
            확인하는 내부 화면입니다.
          </p>
        </div>
        <div className="rounded-2xl bg-[#0c1b33] px-5 py-4 text-white">
          <p className="text-sm text-slate-300">수령·이용 완료 사용자 (자기보고)</p>
          <p className="mt-1 text-xl font-semibold text-[#dfff54]">
            {dashboard?.live.received ?? 0}명 · 내 계정 기준
          </p>
          <p className="mt-1 text-sm text-slate-400">
            사용자 보고 {won.format(dashboard?.live.receivedValue ?? 0)}원 · 기관 확인 아님
          </p>
        </div>
      </div>
      <section className="mt-8 rounded-[2rem] border border-[#bedfd5] bg-[#f4fbf8] p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[#176d55]">아하루프 패스 · 접근 부담 KPI</p><h2 className="mt-2 text-xl font-semibold">세 번 안에 가치를 보여주고, 다음에는 한 가지만 묻습니다.</h2></div><Badge variant="outline" className="border-[#8bcab5] bg-white">제품 제약: 3회 선택 · 1화면 1결정</Badge></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricDefinition title="패스 시작" value={`${dashboard?.pass.sessions ?? 0}회`} note="내 계정의 측정 세션" />
          <MetricDefinition title="첫 혜택 도달률" value={passActivation === null ? "측정 대기" : `${passActivation}%`} note={`${dashboard?.pass.firstBenefitViews ?? 0}회 도달 · 실제 고객 전체 아님`} />
          <MetricDefinition title="첫 혜택까지 선택" value={dashboard?.pass.avgChoices === null || dashboard?.pass.avgChoices === undefined ? "측정 대기" : `${dashboard.pass.avgChoices}회`} note="목표 3회 이하" />
          <MetricDefinition title="첫 혜택까지 시간" value={dashboard?.pass.avgElapsedMs === null || dashboard?.pass.avgElapsedMs === undefined ? "측정 대기" : `${Math.max(1, Math.round(dashboard.pass.avgElapsedMs / 1000))}초`} note="기준선 수집 후 목표 확정" />
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">하네스는 3회 선택 게이트와 한 화면 1질문을 자동 검사합니다. 실제 개선 효과는 고객 세션이 쌓인 뒤 현재 화면과 비교해야 합니다.</p>
      </section>
      <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <Users className="size-5 text-[#176d55]" />
          <h2 className="text-xl font-semibold">내 계정의 진행 단계</h2>
          <Badge variant="outline">
            {dashboard?.scope ?? "전국 · 전 생애주기"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          단계마다 사용자 수로 집계합니다. 여러 혜택을 시작해도 한 사람은 1명이며,
          실제 고객 전체의 성과가 아닙니다. 신청 건별 주차 분석은 검증실에서 확인하세요.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {funnel.map((item, index) => (
            <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-600">
                  0{index + 1}
                </span>
                <strong className="text-2xl text-[#176d55]">
                  {item.value}
                </strong>
              </div>
              <p className="mt-4 font-semibold">{item.label}</p>
              <p className="mt-1 text-sm text-slate-500">{item.definition}</p>
              <Progress
                value={(item.value / base) * 100}
                className="mt-4 h-2 [&>div]:bg-[#1f8064]"
              />
            </div>
          ))}
        </div>
      </section>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-[#176d55]" />
            <h2 className="text-xl font-semibold">판정 추적 구조</h2>
          </div>
          <div className="mt-5 space-y-3">
            {[
              ["고객의 말", "부산 · 72세 · 독거 · 이동 불편"],
              ["구조화 조건", "region · age · life stage · household · needs"],
              ["혜택 규칙", "대상 / 정보 필요 / 현재 제외 / 감시"],
              ["CRM 행동", "근거 확인 · 준비 시작 · 신청 · 수령"],
            ].map(([label, value], index) => (
              <div
                key={label}
                className="grid grid-cols-[32px_110px_1fr] items-start gap-2 rounded-xl bg-slate-50 p-3"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#e2faef] text-sm font-bold text-[#176d55]">
                  {index + 1}
                </span>
                <strong className="text-sm">{label}</strong>
                <span className="text-sm text-slate-500">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            원문 요구와 판정 결과를 역추적하고, 고객 행동은 CRM 이벤트로
            남깁니다.
          </p>
        </section>
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="size-5 text-[#176d55]" />
            <h2 className="text-xl font-semibold">다음 실험 백로그</h2>
          </div>
          <div className="mt-5 space-y-4">
            <Experiment
              priority="P0"
              hypothesis="지역·만 나이·생활 상태 세 번만 고르면 첫 혜택에 도달한다"
              metric="3회 내 첫 혜택 도달률"
            />
            <Experiment
              priority="P0"
              hypothesis="첫 혜택을 본 뒤 필요한 조건을 한 번에 하나만 물으면 준비 시작이 늘어난다"
              metric="첫 혜택→준비 시작률"
            />
            <Experiment
              priority="P1"
              hypothesis="이미 확인한 조건을 재사용하면 공식 원문 이동 전 반복 입력이 줄어든다"
              metric="세션당 중복 입력 수"
            />
          </div>
        </section>
      </div>
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricDefinition
          title="핵심 성과"
          value="수령·이용 완료 사용자"
          note="현금과 비현금 가치 모두 추적 · 자기보고 분리"
        />
        <MetricDefinition
          title="접근 활성화"
          value="3회 내 첫 혜택 도달률"
          note="첫 가치까지의 클릭 부담"
        />
        <MetricDefinition
          title="행동 전환"
          value="첫 혜택→준비 시작률"
          note="안내가 실제 준비로 이어졌는지"
        />
        <MetricDefinition
          title="안전 지표"
          value="정정률·민감정보 선요구"
          note={`미리보기 반응 ${notificationActions}회는 성과 제외`}
        />
      </section>
      <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Sparkles className="size-5 text-[#176d55]" />
          <h2 className="text-xl font-semibold">삼쩜삼 비즈니스와의 포지션 차이</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">공개된 서비스 화면을 기준으로 비교한 제품 전략입니다. 비공개 발송 로직은 추정하지 않습니다.</p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {[
            ["핵심 고객", "사업자·사장님", "전 생애주기·가구 상황"],
            ["핵심 문제", "세금 일정·사업 지원 정보", "흩어진 혜택의 실제 회수"],
            ["공개 접점", "일정·정보·서비스 확인", "조건 확인→신청→수령 확인을 지향"],
            ["추천 근거", "사업자 맞춤 콘텐츠", "맞는·모르는 조건과 공식 원문"],
            ["성공 지표", "내부 지표 확인 불가", "수령·이용 완료 사용자 수"],
          ].map(([label, competitor, ahaloop], index) => (
            <div key={label} className={`grid gap-2 p-4 text-sm sm:grid-cols-[130px_1fr_1fr] ${index ? "border-t border-slate-200" : ""}`}>
              <strong>{label}</strong><span className="text-slate-500">삼쩜삼 비즈니스 · {competitor}</span><span className="font-medium text-[#176d55]">아하루프 · {ahaloop}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Experiment({
  priority,
  hypothesis,
  metric,
}: {
  priority: string;
  hypothesis: string;
  metric: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline">{priority}</Badge>
        <span className="text-xs text-slate-400">측정: {metric}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">{hypothesis}</p>
    </div>
  );
}

function MetricDefinition({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl bg-[#0c1b33] p-5 text-white">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-[#8bf5d2]">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{note}</p>
    </div>
  );
}
function MiniFeature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e2faef] text-[#176d55]">
        {icon}
      </div>
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-6 py-5 sm:px-8">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}
function ProgressItem({
  label,
  value,
  text,
}: {
  label: string;
  value: number;
  text: string;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span>{label}</span>
        <strong>{text}</strong>
      </div>
      <Progress
        value={value}
        className="h-2 bg-slate-100 [&>div]:bg-[#1f8064]"
      />
    </div>
  );
}
