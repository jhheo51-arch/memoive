import { isAdmin } from '@/lib/admin-auth';

export async function GET(request: Request) {
  return Response.json({ isAdmin: await isAdmin(request) }, { headers: { 'Cache-Control': 'no-store' } });
}
