import { env } from 'cloudflare:workers';

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key');
  if (!key || !key.startsWith('diary/')) return new Response('Not found', { status: 404 });
  const image = await env.UPLOADS.get(key);
  if (!image) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  image.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(image.body, { headers });
}
