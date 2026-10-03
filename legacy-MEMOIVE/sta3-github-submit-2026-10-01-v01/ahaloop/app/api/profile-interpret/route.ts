import { interpret } from "@/lib/profile-model";
export async function POST(request:Request) {
  try {const {statement}=await request.json() as {statement?:unknown};
    if(typeof statement!=="string"||statement.trim().length<5||statement.length>500)return Response.json({error:"현재 상황을 5~500자로 들려주세요."},{status:400});
    return Response.json(interpret(statement.trim()));
  } catch {return Response.json({error:"입력 형식을 확인해 주세요."},{status:400});}
}
