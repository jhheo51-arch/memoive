import assert from 'node:assert/strict';
import { corsHeaders, preflight } from '../api/_cors.mjs';

for (const origin of [
  'https://memoive.vercel.app',
  'https://memoive-demo.pages.dev',
  'https://jhheo51-arch.github.io'
]) {
  const request = new Request('https://memoive.vercel.app/api/sync', { method: 'OPTIONS', headers: { Origin: origin } });
  assert.equal(corsHeaders(request)['Access-Control-Allow-Origin'], origin);
  assert.equal((await preflight(request)).status, 204);
}

const denied = new Request('https://memoive.vercel.app/api/sync', { method: 'OPTIONS', headers: { Origin: 'https://example.com' } });
assert.deepEqual(corsHeaders(denied), {});
assert.equal((await preflight(denied)).status, 403);

console.log('PASS: Vercel, Cloudflare Pages, and GitHub Pages can use the shared owner API; unrelated origins are denied.');
