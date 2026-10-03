import { isAdmin, saveAdminPassword } from '@/lib/admin-auth';

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ message: '허재혁님만 접근이 가능합니다' }, { status: 401 });
  const body = (await request.json()) as { password?: unknown };
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 6 || password.length > 64) return Response.json({ message: '새 비밀번호는 6자 이상 64자 이하로 입력해 주세요.' }, { status: 400 });
  await saveAdminPassword(password);
  return Response.json({ saved: true });
}
