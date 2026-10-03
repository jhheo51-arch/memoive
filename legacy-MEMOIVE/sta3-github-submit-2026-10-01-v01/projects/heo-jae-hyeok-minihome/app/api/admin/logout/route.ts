import { clearAdminSessionCookie } from '@/lib/admin-auth';

export async function POST() {
  return Response.json({ isAdmin: false }, { headers: { 'Set-Cookie': clearAdminSessionCookie() } });
}
