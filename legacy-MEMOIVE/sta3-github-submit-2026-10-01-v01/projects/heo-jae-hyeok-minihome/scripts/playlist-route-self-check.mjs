import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import { getYoutubeVideoId } from '../lib/minihome.ts';

// Run the real handler with local stand-ins for authentication and D1; no external writes.
const source = await readFile(new URL('../app/api/settings/route.ts', import.meta.url), 'utf8');
const script = stripTypeScriptTypes(source)
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/export async function /g, 'async function ');
let admin = true;
let writes = 0;
let savedUrl = '';
const env = { DB: { prepare: () => ({
  bind: (...values) => ({ run: async () => { writes++; savedUrl = values[2]; } }),
  first: async () => ({ youtubeUrl: savedUrl }),
}) } };
const context = vm.createContext({ env, isAdmin: async () => admin, getYoutubeVideoId, Response });
vm.runInContext(script, context);
const patch = (youtubeUrl) => context.PATCH(new Request('https://local.test/api/settings', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ youtubeUrl }),
}));
let cases = 0;
for (const input of [
  'ftp://youtube.com/watch?v=dQw4w9WgXcQ',
  'https://user:pass@youtube.com/watch?v=dQw4w9WgXcQ',
  'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ',
  'https://youtu.be/dQw4w9WgXcQ/extra',
  'https://youtube.com/watch?v=1234567890',
  'https://youtu.be/dQw4w9WgXcQ?x=' + 'a'.repeat(300),
  '',
]) {
  const response = await patch(input);
  assert.equal(response.status, 400);
  assert.equal(writes, 0);
  assert.ok((await response.json()).message);
  cases++;
}
admin = false;
assert.equal((await patch('https://youtu.be/dQw4w9WgXcQ')).status, 401);
assert.equal(writes, 0);
cases++;
admin = true;
const response = await patch('  https://youtu.be/dQw4w9WgXcQ  ');
assert.equal(response.status, 200);
assert.equal(writes, 1);
assert.equal((await response.json()).settings.youtubeUrl, 'https://youtu.be/dQw4w9WgXcQ');
cases++;
console.log(`playlist route self-check passed (${cases} cases)`);
