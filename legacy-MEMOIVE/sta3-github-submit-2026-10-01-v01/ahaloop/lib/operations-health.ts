export type OperationalAlert={
  key:string;
  category:"source"|"notification"|"data"|"followup";
  severity:"warning"|"critical";
  title:string;
  detail:string;
};

export type OperationsSnapshot={
  sourceChecks:{benefitId:string;status:string;discoveredAt:string}[];
  notificationAttempts:{channel:string;status:string;createdAt:string;updatedAt:string}[];
  pass:{sessions:number;firstBenefitViews:number;avgChoices:number|null};
  receiptAnomalies:number;
  overdueFollowups:number;
};

const minutesSince=(value:string,nowMs:number)=>(nowMs-Date.parse(value))/60000;

export function evaluateOperationsHealth(snapshot:OperationsSnapshot,nowMs=Date.now()){
  const alerts:OperationalAlert[]=[];
  for(const source of snapshot.sourceChecks){
    if(source.status==="failed")alerts.push({key:`source:${source.benefitId}:failed`,category:"source",severity:"critical",title:"공식 원문 확인 실패",detail:`${source.benefitId}의 마지막 확인이 실패했습니다. 자동 재시도하지 말고 공식 원문과 접근 상태를 확인하세요.`});
    if(["pending","changed"].includes(source.status)&&minutesSince(source.discoveredAt,nowMs)>180)alerts.push({key:`source:${source.benefitId}:review-overdue`,category:"source",severity:"warning",title:"원문 검수가 3시간을 넘겼습니다",detail:`${source.benefitId}의 조건·기간·금액 검수를 완료하거나 반려 사유를 기록하세요.`});
  }
  const notificationFailures=snapshot.notificationAttempts.filter(attempt=>["failed","unknown"].includes(attempt.status));
  if(notificationFailures.length)alerts.push({key:"notification:failed-or-unknown",category:"notification",severity:"critical",title:"발송 결과 확인 필요",detail:`최근 실패·확인 불가 발송 ${notificationFailures.length}건입니다. 중복 발송하지 말고 제공업체 기록을 확인하세요.`});
  const stuck=snapshot.notificationAttempts.filter(attempt=>attempt.status==="sending"&&minutesSince(attempt.updatedAt||attempt.createdAt,nowMs)>15);
  if(stuck.length)alerts.push({key:"notification:sending-stuck",category:"notification",severity:"critical",title:"발송 요청이 15분 이상 처리 중입니다",detail:`처리 중 상태 ${stuck.length}건입니다. 재발송 전에 제공업체 접수 여부를 확인하세요.`});
  if(snapshot.pass.firstBenefitViews>snapshot.pass.sessions)alerts.push({key:"data:pass-orphan-view",category:"data",severity:"critical",title:"패스 이벤트 순서가 맞지 않습니다",detail:"시작 세션보다 첫 혜택 도달 세션이 많습니다. 이벤트 중복·누락을 점검하세요."});
  if(snapshot.pass.avgChoices!==null&&snapshot.pass.avgChoices>3)alerts.push({key:"data:choice-gate",category:"data",severity:"warning",title:"첫 혜택까지 평균 선택 수가 3회를 넘었습니다",detail:`현재 평균 ${snapshot.pass.avgChoices}회입니다. 지역·나이·생활 상태 외 질문이 앞에 끼어들지 않았는지 확인하세요.`});
  if(snapshot.pass.sessions>=5&&snapshot.pass.firstBenefitViews/snapshot.pass.sessions<0.7)alerts.push({key:"data:activation-drop",category:"data",severity:"warning",title:"첫 혜택 도달률이 70% 아래입니다",detail:"표본 5세션 이상에서 도달률이 기준선 아래입니다. 중단 지점과 저장 오류를 확인하세요."});
  if(snapshot.receiptAnomalies)alerts.push({key:"data:receipt-incomplete",category:"data",severity:"critical",title:"수령 기록의 필수 근거가 비어 있습니다",detail:`수령 단계 ${snapshot.receiptAnomalies}건에 수령일 또는 확인 방식이 없습니다.`});
  if(snapshot.overdueFollowups)alerts.push({key:"followup:overdue",category:"followup",severity:"warning",title:"기한이 지난 후속 작업이 있습니다",detail:`기한 초과 ${snapshot.overdueFollowups}건의 담당 상태와 결과를 확인하세요.`});
  const status=alerts.some(alert=>alert.severity==="critical")?"critical":alerts.length?"attention":"healthy";
  return {status,alerts,metrics:{
    sourceChecks:snapshot.sourceChecks.length,
    sourceFailures:snapshot.sourceChecks.filter(row=>row.status==="failed").length,
    notificationFailures:notificationFailures.length+stuck.length,
    dataAnomalies:alerts.filter(alert=>alert.category==="data").length,
    overdueFollowups:snapshot.overdueFollowups,
  }} as const;
}
