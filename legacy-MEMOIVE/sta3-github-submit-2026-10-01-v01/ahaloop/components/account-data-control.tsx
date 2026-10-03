"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ShieldCheck, Trash2 } from "lucide-react";

type Retention={
  notificationAttemptsDays:number;
  activityDays:number;
  operationsHealthDays:number;
  followupDays:number;
  accountRecords:string;
  enforcement:string;
};

export function AccountDataControl({retention,onDeleted}:{retention:Retention|null;onDeleted:()=>void}) {
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const valid=confirmation==="내 데이터 삭제";
  async function removeAccountData(){
    if(!valid)return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/account",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmation})});
      const result=await response.json() as {message?:string;error?:string};
      if(!response.ok)throw new Error(result.error);
      setMessage(result.message??"저장 자료를 삭제했습니다.");setConfirmation("");onDeleted();
    }catch(error){setMessage(error instanceof Error?error.message:"삭제하지 못했습니다.");}
    finally{setBusy(false);}
  }
  return <section className="mt-6 rounded-[2rem] border border-slate-200 bg-white p-6 sm:p-8">
    <div className="flex items-start gap-3"><ShieldCheck aria-hidden="true" className="mt-1 size-5 text-[#176d55]"/><div><h2 className="text-xl font-semibold">내 데이터 보관·삭제</h2><p className="mt-2 leading-7 text-slate-600">혜택 판정에 필요한 최소 정보만 계정별로 분리해 저장합니다. 공유 혜택 목록은 개인 데이터가 아닙니다.</p></div></div>
    <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500">발송 시도 기록</dt><dd className="mt-1 font-semibold">{retention?`${retention.notificationAttemptsDays}일`:"불러오는 중"}</dd></div><div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500">활동·평가·원문 검수</dt><dd className="mt-1 font-semibold">{retention?`${retention.activityDays}일`:"불러오는 중"}</dd></div><div className="rounded-xl bg-slate-50 p-4"><dt className="text-slate-500">프로필·신청함·동의</dt><dd className="mt-1 font-semibold">{retention?.accountRecords??"불러오는 중"}</dd></div></dl>
    <p className="mt-3 text-sm leading-6 text-slate-500">{retention?.enforcement??"보관 기준을 확인하고 있습니다."} 운영 감시 기록은 최대 {retention?.operationsHealthDays??180}일, 후속 작업은 최대 {retention?.followupDays??365}일 보관합니다.</p>
    <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" className="mt-5 border-red-200 text-red-700 hover:bg-red-50"><Trash2 aria-hidden="true"/>내 저장 자료 삭제</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>이 계정의 아하루프 자료를 삭제할까요?</AlertDialogTitle><AlertDialogDescription className="leading-6">프로필, 신청 진행, 이벤트, 알림 동의, 검수·파일럿 기록이 함께 삭제되며 되돌릴 수 없습니다. ChatGPT 계정 자체는 삭제되지 않습니다.</AlertDialogDescription></AlertDialogHeader><div><Label htmlFor="delete-confirmation">계속하려면 ‘내 데이터 삭제’를 입력하세요.</Label><Input id="delete-confirmation" className="mt-2" value={confirmation} onChange={(event)=>setConfirmation(event.target.value)} autoComplete="off"/></div><AlertDialogFooter><AlertDialogCancel disabled={busy}>취소</AlertDialogCancel><Button variant="destructive" disabled={!valid||busy} onClick={removeAccountData}>{busy?"삭제 중…":"저장 자료 삭제"}</Button></AlertDialogFooter></AlertDialogContent></AlertDialog>
    {message&&<p role="status" className="mt-4 text-sm text-slate-700">{message}</p>}
  </section>;
}
