// Node 22.13+; execute the real route with only the worker DB/auth boundary mocked.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../app/api/guestbook/route.ts', import.meta.url), 'utf8');
const executable = stripTypeScriptTypes(source)
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/export async function /g, 'async function ');
let admin = true;
let dbFailure = false;
let authFailure = false;
let row = { id: 1, nickname: '허재혁', message: '안녕하세요', createdAt: 100 };
let queries = [];
const route = runInNewContext(`${executable}\n({ GET, POST, PATCH, DELETE })`, {
  Request, Response, console: { error() {} },
  isAdmin: async () => {
    if (authFailure) throw new Error('auth failure');
    return admin;
  },
  env: { DB: { prepare(sql) {
    if (dbFailure) throw new Error('database failure');
    const query = { sql, values: [] };
    queries.push(query);
    return {
      bind(...values) { query.values = values; return this; },
      async first() { return row; },
      async all() { return { results: [row] }; },
    };
  } } },
});
let count = 0;
async function check(method, payload, status, verify = () => {}, raw = false) {
  queries = [];
  const response = await route[method](new Request('https://example.test/api/guestbook', {
    method, ...(method === 'GET' ? {} : { body: raw ? payload : JSON.stringify(payload) }),
  }));
  assert.equal(response.status, status, `${method}: ${JSON.stringify(payload)}`);
  assert.match(response.headers.get('content-type'), /application\/json/);
  const body = await response.json();
  if (status >= 400) assert.equal(typeof body.message, 'string');
  if (status === 400 || status === 401) assert.equal(queries.length, 0);
  verify(body, response);
  count += 1;
}
const valid = { id: 1, nickname: '허재혁', message: '안녕하세요' };
for (const method of ['POST', 'PATCH', 'DELETE']) {
  for (const invalid of [null, [], 'text', 12, true]) await check(method, invalid, 400);
  await check(method, '{broken', 400, undefined, true);
  dbFailure = true;
  await check(method, valid, 500);
  dbFailure = false;
}
for (const method of ['PATCH', 'DELETE']) {
  for (const id of [true, false, [], [1], {}, null, '', '1.0', '1e0', 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    await check(method, { ...valid, id }, 400);
  }
  admin = false;
  await check(method, '{broken', 401, body => assert.equal(body.message, '허재혁님만 접근이 가능합니다'), true);
  admin = true;
  authFailure = true;
  await check(method, valid, 500);
  authFailure = false;
  row = null;
  await check(method, valid, 404);
  row = { ...valid, createdAt: 100 };
  for (const id of [1, '1']) await check(method, { ...valid, id }, 200, body => {
    assert.equal(method === 'PATCH' ? body.entry.id : body.deletedId, 1);
    assert.equal(queries[0].values.at(-1), 1);
  });
}
for (const method of ['POST', 'PATCH']) {
  for (const changed of [{ nickname: ' ' }, { message: '\n ' }, { nickname: 1 }, { message: [] }, { nickname: '가'.repeat(21) }, { message: '가'.repeat(201) }]) {
    await check(method, { ...valid, ...changed }, 400);
  }
  await check(method, { ...valid, nickname: ' 가 ', message: ' 나 ' }, method === 'POST' ? 201 : 200, () => {
    assert.deepEqual(queries[0].values.slice(0, 2), ['가', '나']);
  });
  await check(method, { ...valid, nickname: '가'.repeat(20), message: '가'.repeat(200) }, method === 'POST' ? 201 : 200);
}
admin = false;
await check('POST', valid, 201); // Visitors can still post without admin credentials.
row = null;
await check('POST', valid, 500); // Never report success without a saved row.
row = { ...valid, createdAt: 100 };
await check('GET', null, 200, (body, response) => {
  assert.equal(body.entries[0].id, 1);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.match(queries[0].sql, /ORDER BY created_at DESC, id DESC/);
});
dbFailure = true;
await check('GET', null, 500);
console.log(`guestbook route self-check passed (${count} cases; DB/auth mocked, no live data changed)`);
