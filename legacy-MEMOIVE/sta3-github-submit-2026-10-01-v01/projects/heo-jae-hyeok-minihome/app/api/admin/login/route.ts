import { clearLoginFailures, createAdminSessionCookie, isLoginBlocked, loginClientKey, recordLoginFailure, verifyAdminPassword } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const clientKey = await loginClientKey(request);
  if (await isLoginBlocked(clientKey)) return Response.json({ message: '허재혁님만 접근이 가능합니다' }, { status: 429 });
  const body = (await request.json()) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !(await verifyAdminPassword(password))) {
    await recordLoginFailure(clientKey);
    return Response.json({ message: '허재혁님만 접근이 가능합니다' }, { status: 401 });
  }
  await clearLoginFailures(clientKey);
  return Response.json({ isAdmin: true }, { headers: { 'Set-Cookie': await createAdminSessionCookie() } });
}
