import { env } from 'cloudflare:workers';

const encoder = new TextEncoder();
const SESSION_SECONDS = 12 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_FAILURES = 5;

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(env.ADMIN_SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value))));
}

function safeEqual(first: string, second: string) {
  const a = encoder.encode(first);
  const b = encoder.encode(second);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) difference |= (a[index] || 0) ^ (b[index] || 0);
  return difference === 0;
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations: 160_000 }, key, 256,
  );
  return bytesToBase64Url(new Uint8Array(bits));
}

function readCookie(request: Request, name: string) {
  const cookies = request.headers.get('Cookie') || '';
  for (const item of cookies.split(';')) {
    const [key, ...parts] = item.trim().split('=');
    if (key === name) return parts.join('=');
  }
  return null;
}

export async function isAdmin(request: Request) {
  const token = readCookie(request, 'heo_admin_session');
  if (!token) return false;
  const [expiresText, signature] = token.split('.');
  const expiresAt = Number(expiresText);
  if (!signature || !Number.isFinite(expiresAt) || Date.now() >= expiresAt) return false;
  return safeEqual(signature, await hmac(expiresText));
}

export async function createAdminSessionCookie() {
  const expiresAt = Date.now() + SESSION_SECONDS * 1000;
  const signature = await hmac(String(expiresAt));
  return `heo_admin_session=${expiresAt}.${signature}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_SECONDS}`;
}

export function clearAdminSessionCookie() {
  return 'heo_admin_session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0';
}

export async function verifyAdminPassword(password: string) {
  const row = await env.DB.prepare(`
    SELECT password_hash AS passwordHash, password_salt AS passwordSalt
    FROM admin_credentials WHERE id = 1
  `).first<{ passwordHash: string; passwordSalt: string }>();
  if (!row) return safeEqual(password, env.ADMIN_INITIAL_PASSWORD);
  const derived = await derivePasswordHash(password, base64UrlToBytes(row.passwordSalt));
  return safeEqual(derived, row.passwordHash);
}

export async function saveAdminPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const passwordHash = await derivePasswordHash(password, salt);
  await env.DB.prepare(`
    INSERT INTO admin_credentials (id, password_hash, password_salt, updated_at)
    VALUES (1, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      password_hash = excluded.password_hash,
      password_salt = excluded.password_salt,
      updated_at = excluded.updated_at
  `).bind(passwordHash, bytesToBase64Url(salt), Date.now()).run();
}

export async function loginClientKey(request: Request) {
  const address = request.headers.get('CF-Connecting-IP') || 'local';
  const agent = request.headers.get('User-Agent') || 'unknown';
  return (await hmac(`${address}|${agent}`)).slice(0, 43);
}

export async function isLoginBlocked(clientKey: string) {
  const row = await env.DB.prepare(`
    SELECT failed_count AS failedCount, window_started_at AS windowStartedAt
    FROM admin_login_attempts WHERE client_key = ?
  `).bind(clientKey).first<{ failedCount: number; windowStartedAt: number }>();
  return Boolean(row && Date.now() - row.windowStartedAt < LOGIN_WINDOW_MS && row.failedCount >= MAX_LOGIN_FAILURES);
}

export async function recordLoginFailure(clientKey: string) {
  const now = Date.now();
  const row = await env.DB.prepare(`SELECT failed_count AS failedCount, window_started_at AS windowStartedAt FROM admin_login_attempts WHERE client_key = ?`).bind(clientKey).first<{ failedCount: number; windowStartedAt: number }>();
  if (!row || now - row.windowStartedAt >= LOGIN_WINDOW_MS) {
    await env.DB.prepare(`INSERT INTO admin_login_attempts (client_key, failed_count, window_started_at) VALUES (?, 1, ?) ON CONFLICT(client_key) DO UPDATE SET failed_count = 1, window_started_at = excluded.window_started_at`).bind(clientKey, now).run();
    return;
  }
  await env.DB.prepare(`UPDATE admin_login_attempts SET failed_count = failed_count + 1 WHERE client_key = ?`).bind(clientKey).run();
}

export async function clearLoginFailures(clientKey: string) {
  await env.DB.prepare(`DELETE FROM admin_login_attempts WHERE client_key = ?`).bind(clientKey).run();
}
