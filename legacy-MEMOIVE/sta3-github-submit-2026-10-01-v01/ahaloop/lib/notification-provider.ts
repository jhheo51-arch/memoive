export type NotificationConfig = Partial<Record<"SOLAPI_API_KEY"|"SOLAPI_API_SECRET"|"SOLAPI_SENDER"|"SOLAPI_KAKAO_PFID"|"SOLAPI_KAKAO_TEMPLATE_ID"|"NOTIFICATION_PILOT_USER_ID"|"NOTIFICATION_PILOT_PHONE"|"NOTIFICATION_SEND_ENABLED",string>>;
export const TEST_NOTIFICATION_TEXT="[아하루프] 요청하신 알림 연결 테스트입니다. 혜택 지급 확정 안내가 아닙니다.";
export function notificationReadiness(config:NotificationConfig,userId:string,channel:"sms"|"kakao") {
  const reasons:string[]=[];
  if(!config.SOLAPI_API_KEY||!config.SOLAPI_API_SECRET)reasons.push("발송업체 인증 연결 전");
  if(!config.NOTIFICATION_PILOT_USER_ID||!/^010\d{8}$/.test(config.NOTIFICATION_PILOT_PHONE??""))reasons.push("운영자 테스트 계정·수신번호 확인 전");
  if(config.NOTIFICATION_PILOT_USER_ID&&config.NOTIFICATION_PILOT_USER_ID!==userId)reasons.push("등록된 테스트 계정만 발송 가능");
  if(channel==="sms"&&!/^0\d{8,10}$/.test(config.SOLAPI_SENDER??""))reasons.push("문자 발신번호 등록·연결 전");
  if(channel==="kakao"&&(!config.SOLAPI_KAKAO_PFID||!config.SOLAPI_KAKAO_TEMPLATE_ID))reasons.push("카카오톡 채널·승인 템플릿 연결 전");
  if(config.NOTIFICATION_SEND_ENABLED!=="true")reasons.push("유료 테스트 발송 비활성화");
  return {ready:reasons.length===0,reasons};
}
export async function solapiAuthorization(apiKey:string,secret:string,date=new Date().toISOString(),salt=crypto.randomUUID().replaceAll("-","")) {
  const encoder=new TextEncoder();
  const key=await crypto.subtle.importKey("raw",encoder.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const bytes=await crypto.subtle.sign("HMAC",key,encoder.encode(date+salt));
  const signature=Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,"0")).join("");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}
export async function sendPilotNotification(config:NotificationConfig,channel:"sms"|"kakao",requestId:string,transport:typeof fetch=fetch) {
  // A timeout may mean the provider accepted it. Never automatically retry this POST.
  try {
    const message=channel==="sms"
      ?{to:config.NOTIFICATION_PILOT_PHONE,from:config.SOLAPI_SENDER,text:TEST_NOTIFICATION_TEXT,type:"LMS"}
      :{to:config.NOTIFICATION_PILOT_PHONE,type:"ATA",kakaoOptions:{pfId:config.SOLAPI_KAKAO_PFID,templateId:config.SOLAPI_KAKAO_TEMPLATE_ID,disableSms:true,variables:{}}};
    const response=await transport("https://api.solapi.com/messages/v4/send-many/detail",{method:"POST",redirect:"error",signal:AbortSignal.timeout(12000),headers:{"Content-Type":"application/json",Authorization:await solapiAuthorization(config.SOLAPI_API_KEY!,config.SOLAPI_API_SECRET!)},body:JSON.stringify({messages:[{...message,customFields:{requestId}}],strict:true,allowDuplicates:false,showMessageList:true})});
    if(!response.ok)return {status:response.status>=500?"unknown":"failed",messageId:null,groupId:null} as const;
    const result=await response.json() as {messageList?:{messageId?:string;statusCode?:string}[];failedMessageList?:unknown[];groupInfo?:{groupId?:string;count?:{registeredSuccess?:number}}};
    const item=result.messageList?.[0];
    if(result.failedMessageList?.length)return {status:"failed",messageId:null,groupId:null} as const;
    if(!item?.messageId||result.groupInfo?.count?.registeredSuccess!==1)return {status:"unknown",messageId:null,groupId:result.groupInfo?.groupId??null} as const;
    return {status:"accepted",messageId:item.messageId,groupId:result.groupInfo?.groupId??null} as const;
  } catch { return {status:"unknown",messageId:null,groupId:null} as const; }
}
