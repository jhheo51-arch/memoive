import { env } from 'cloudflare:workers';

function kstDateKey(offsetDays = 0) {
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000 + offsetDays * 86_400_000);
  return date.toISOString().slice(0, 10);
}

async function visitorKey(request: Request, browserId: string) {
  const raw = `${browserId}|${request.headers.get('User-Agent') || 'unknown'}`;
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function readStats() {
  const startDate = kstDateKey(-6);
  const result = await env.DB.prepare(`
    SELECT date_key AS dateKey, COUNT(*) AS count
    FROM daily_visitors
    WHERE date_key >= ?
    GROUP BY date_key
    ORDER BY date_key ASC
  `).bind(startDate).all<{ dateKey: string; count: number }>();
  const counts = new Map(result.results.map((row) => [row.dateKey, Number(row.count)]));
  return Array.from({ length: 7 }, (_, index) => {
    const dateKey = kstDateKey(index - 6);
    return { dateKey, count: counts.get(dateKey) || 0 };
  });
}

export async function GET() {
  return Response.json({ stats: await readStats() }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const cookieText = request.headers.get('Cookie') || '';
  const existing = cookieText.split(';').map((value) => value.trim()).find((value) => value.startsWith('heo_visitor='))?.slice('heo_visitor='.length);
  const browserId = existing || crypto.randomUUID();
  const key = await visitorKey(request, browserId);
  await env.DB.prepare(`INSERT OR IGNORE INTO daily_visitors (date_key, visitor_key, created_at) VALUES (?, ?, ?)`).bind(kstDateKey(), key, Date.now()).run();
  const headers = new Headers({ 'Cache-Control': 'no-store' });
  if (!existing) headers.set('Set-Cookie', `heo_visitor=${browserId}; Path=/; Secure; SameSite=Lax; Max-Age=31536000`);
  return Response.json({ stats: await readStats() }, { headers });
}
