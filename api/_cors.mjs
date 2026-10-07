const DEFAULT_ALLOWED_ORIGINS = [
  'https://memoive.vercel.app',
  'https://memoive-private-20260926.sooyeon-jun-0389.chatgpt.site'
];

function allowedPatterns() {
  return String(process.env.MEMOIVE_ALLOWED_ORIGINS || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

function matchesOrigin(origin, pattern) {
  if (origin === pattern) return true;
  if (!pattern.startsWith('*.')) return false;
  try {
    const host = new URL(origin).hostname;
    const suffix = pattern.slice(1);
    return host.endsWith(suffix) && host.length > suffix.length;
  } catch {
    return false;
  }
}

export function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  if (!origin) return {};
  const allowed = [
    ...DEFAULT_ALLOWED_ORIGINS,
    '*.pages.dev',
    '*.workers.dev',
    '*.github.io',
    ...allowedPatterns()
  ];
  if (!allowed.some(pattern => matchesOrigin(origin, pattern))) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-Match',
    'Access-Control-Expose-Headers': 'ETag',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

export function preflight(request) {
  if (request.method !== 'OPTIONS') return null;
  const headers = corsHeaders(request);
  return Object.keys(headers).length
    ? new Response(null, { status: 204, headers })
    : new Response(JSON.stringify({ message: '허용되지 않은 서비스 주소예요.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
}
