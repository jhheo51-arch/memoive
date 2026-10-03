"use client";
import { useEffect,useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
type Connection={sms:{ready:boolean;reasons:string[]};kakao:{ready:boolean;reasons:string[]};recipient:string|null;text:string;attempts:{channel:string;status:string;created_at:string}[]};
const statusLabels:Record<string,string>={sending:"처리 중 · 재전송 금지",accepted:"업체 접수 · 도착 미확인",failed:"업체 요청 거절",unknown:"결과 불명 · 재전송 금지"};
export function NotificationConnection(){
  const [data,setData]=useState<Connection|null>(null);const [channel,setChannel]=useState<"sms"|"kakao">("sms");const [confirmed,setConfirmed]=useState(false);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  async function refresh(){try{const r=await fetch("/api/notification-test",{cache:"no-store"});if(!r.ok)throw new Error();setData(await r.json());}catch{setData(null);setMessage("발송 연결 상태를 불러오지 못했어요.");}}
  useEffect(()=>{queueMicrotask(()=>void refresh());},[]);
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-900"><h3 className="text-lg font-semibold">실제 발송 연결 · 운영자 테스트</h3><p className="mt-2 text-sm leading-6 text-slate-600">문자·알림톡 발송 연결을 확인하는 단계입니다. 고객별 전화번호 인증과 자동 혜택 알림은 아직 제공하지 않습니다.</p>
    <ol className="my-4 list-decimal space-y-2 pl-5 text-sm leading-6"><li><a href="https://solapi.com/start" target="_blank" rel="noreferrer" className="underline">솔라피 가입·발신번호 등록 안내</a>에서 본인 확인을 진행해 주세요.</li><li>발급한 비밀 인증값은 채팅에 보내지 않고 사이트의 서버 비밀 설정에 연결합니다.</li><li>카카오톡은 채널과 승인된 테스트 템플릿을 추가로 연결합니다.</li></ol>
    <div className="flex gap-2">{(["sms","kakao"] as const).map(value=><Button key={value} variant={channel===value?"default":"outline"} onClick={()=>{setChannel(value);setConfirmed(false);setMessage("");}} aria-pressed={channel===value}>{value==="sms"?"문자":"카카오 알림톡"}</Button>)}</div>
    <div className="mt-4 text-sm leading-6" aria-live="polite">{data?<><p className="font-semibold">{data[channel].ready?"설정 확인됨 · 실제 도착 테스트 필요":"발송 준비가 필요해요"}</p>{data[channel].reasons.map(reason=><p key={reason}>• {reason}</p>)}{data.recipient&&<p>테스트 수신처: {data.recipient}</p>}<p className="mt-3 rounded-lg bg-slate-50 p-3">{data.text}</p></>:<p>연결 상태 확인 중 또는 확인 불가</p>}</div>
    <Label className="mt-4 flex items-start gap-3 text-sm leading-6"><Checkbox checked={confirmed} disabled={!data?.[channel].ready||busy} onCheckedChange={v=>setConfirmed(v===true)}/>등록된 본인 번호로 위 테스트 메시지 1건을 받겠습니다. 발송업체에 수신번호·메시지가 전달되며 이용 요금이 발생할 수 있습니다.</Label>
    <Button className="mt-4 min-h-11" disabled={!data?.[channel].ready||!confirmed||busy} onClick={async()=>{setBusy(true);setMessage("");try{const r=await fetch("/api/notification-test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel,confirmed:true})});const result=await r.json() as {message?:string;error?:string};setMessage(result.message??result.error??"발송 결과 확인 필요");await refresh();}catch{setMessage("결과 확인 불가. 재전송하지 말고 업체 내역을 확인해 주세요.");}finally{setBusy(false);setConfirmed(false);}}}>{busy?"업체에 요청 중…":"유료 테스트 1건 보내기"}</Button><Button className="ml-2 mt-4 min-h-11" variant="outline" disabled={busy} onClick={()=>void refresh()}>상태 새로고침</Button>
    <p className="mt-2 text-sm text-slate-600">한국 날짜 기준 하루 1회만 요청합니다. 알림톡 실패 시 문자로 자동 대체하지 않습니다.</p>{message&&<p role="status" className="mt-3 text-sm leading-6">{message}</p>}
    {!!data?.attempts.length&&<ul className="mt-4 space-y-2 text-sm">{data.attempts.map((attempt,index)=><li key={index}>{attempt.channel==="sms"?"문자":"알림톡"} · {statusLabels[attempt.status]??"확인 필요"} · {new Date(attempt.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</li>)}</ul>}
  </section>;
}
