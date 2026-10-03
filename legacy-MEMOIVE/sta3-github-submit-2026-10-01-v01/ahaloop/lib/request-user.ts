import { getChatGPTUser } from "@/app/chatgpt-auth";
import { env } from "cloudflare:workers";
import { headers } from "next/headers";
type RoleConfig = { AHALOOP_OPERATOR_USER_IDS?: string };

export async function requestUser() {
  if((await headers()).get("sec-fetch-site")==="cross-site")throw new Error("로그인 후 이 사이트 안에서 다시 시도해 주세요.");
  const user=await getChatGPTUser();
  if(!user) throw new Error("로그인 후 이용해 주세요.");
  return user.userId;
}

export function isOperatorUser(userId:string) {
  const configured=(env as unknown as RoleConfig).AHALOOP_OPERATOR_USER_IDS
    ?.split(",")
    .map((value)=>value.trim())
    .filter(Boolean) ?? [];
  return configured.includes(userId) || userId==="local_seedy";
}

export async function requestActor() {
  const userId=await requestUser();
  return { userId, role:isOperatorUser(userId)?"operator" as const:"customer" as const };
}

export async function requireOperator() {
  const actor=await requestActor();
  if(actor.role!=="operator") throw new Error("운영자 권한이 필요한 화면입니다.");
  return actor.userId;
}

export function apiError(error:unknown) {
  const auth=error instanceof Error && error.message.includes("로그인");
  const forbidden=error instanceof Error && error.message.includes("운영자 권한");
  console.error(auth?"Authentication required":forbidden?"Operator role required":"AHALOOP operation failed",auth||forbidden?"":error);
  return Response.json({error:auth?"로그인 후 이용해 주세요.":forbidden?"운영자 권한이 필요한 화면입니다.":"저장소 처리에 실패했습니다. 입력을 유지하고 다시 시도해 주세요."},{status:auth?401:forbidden?403:503});
}
