"use client";

import type { Benefit } from "@/lib/benefit-catalog";
import { benefitValueState, valueTotals } from "@/lib/benefit-rules";
import { Button } from "@/components/ui/button";

export function BenefitValueSummary({items,state,onSelect,onProfile,onRetry}:{items:Benefit[];state:"loading"|"ready"|"error";onSelect:(benefit:Benefit)=>void;onProfile:()=>void;onRetry:()=>void}) {
  const totals=valueTotals(items);
  const groups=[
    {key:"needs_info",label:"추가 조건을 알려주세요",description:"계산에 필요한 정보가 부족해요.",action:"필요한 조건 확인"},
    {key:"calculation_pending",label:"금액 계산 준비 중",description:"일부 자격 확인과 자동 금액 계산을 아직 지원하지 않아요. 조건을 더 선택해도 바로 계산되지 않을 수 있어요.",action:"조건·공식 원문 확인"},
    {key:"non_cash",label:"비현금 서비스 후보",description:"돌봄·교육 등은 원화 합계에 넣지 않아요. 이용 자격은 따로 확인해 주세요.",action:"서비스 조건 확인"},
    {key:"calculated_zero",label:"입력값 기준 계산액 없음",description:"확인한 입력값으로 계산한 결과예요. 전체 혜택이 없다는 뜻은 아닙니다.",action:"계산 근거 확인"},
  ].map(group=>({...group,benefits:items.filter(item=>benefitValueState(item)===group.key)}));
  const hasAmount=totals.monthly>0||totals.annual>0||totals.one_time>0;
  const hasCandidates=items.some(item=>benefitValueState(item)!=="excluded");
  return <section aria-label="내 혜택 금액 확인 상태" className="rounded-3xl border border-white/10 bg-white/6 p-5 xl:min-w-72">
    <p className="text-sm text-slate-300">내 혜택 금액 확인 상태</p>
    {state!=="ready"?<><h2 className="mt-3 text-xl font-semibold">{state==="loading"?"혜택을 확인하고 있어요":"혜택을 불러오지 못했어요"}</h2>{state==="error"&&<Button onClick={onRetry} variant="secondary" className="mt-4 min-h-11">다시 불러오기</Button>}</>:<>
      <h2 className="mt-3 text-2xl font-semibold leading-snug text-[#dfff54] [word-break:keep-all]">{hasAmount?"계산 가능한 금액부터 확인하세요":hasCandidates?"아직 금액을 확정할 수 없어요":items.length?"현재 조건에 맞는 후보가 없어요":"아직 확인할 혜택이 없어요"}</h2>
      {hasAmount&&<div className="mt-4 space-y-2">{([["monthly","월"],["annual","연"],["one_time","1회"]] as const).filter(([key])=>totals[key]>0).map(([key,label])=><p key={key} className="text-xl font-semibold">{label} {totals[key].toLocaleString("ko-KR")}원 <span className="text-sm font-normal text-slate-300">계산 예시</span></p>)}<p className="text-sm text-slate-300">지급 확정액이 아니며 아래 미확인 혜택은 제외했어요.</p></div>}
      <div className="mt-4 space-y-3">{groups.filter(group=>group.benefits.length).map(group=><div key={group.key} className="rounded-xl bg-white/5 p-3"><h3 className="font-semibold">{group.label} · {group.benefits.length}건</h3><p className="mt-1 text-sm leading-6 text-slate-300">{group.description}</p><Button variant="secondary" className="mt-2 min-h-11 w-full whitespace-normal text-left" onClick={()=>onSelect(group.benefits[0])}>{group.action}</Button></div>)}</div>
      {!hasCandidates&&<><p className="mt-3 text-sm leading-6 text-slate-300">현재 등록된 공고 범위의 결과입니다. 전국의 모든 혜택을 확인한 결과는 아니에요.</p><Button onClick={onProfile} variant="secondary" className="mt-4 min-h-11">내 조건 다시 확인</Button></>}
    </>}
  </section>;
}
