export async function POST() { return Response.json({error:"실제 발송 제공업체가 연결되지 않았습니다. 검증실의 발송 계획 검증을 이용해 주세요."},{status:409}); }
