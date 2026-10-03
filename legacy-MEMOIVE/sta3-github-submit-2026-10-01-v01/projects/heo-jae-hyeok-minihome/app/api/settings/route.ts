import { env } from 'cloudflare:workers';
import { isAdmin } from '@/lib/admin-auth';
import { getYoutubeVideoId } from '@/lib/minihome';

const defaults = { interestTitle: '사람과 AI가 함께 일하는 방법', interestTags: '#에이전트 #기록 #실험', youtubeUrl: '' };

export async function GET() {
  const row = await env.DB.prepare(`SELECT interest_title AS interestTitle, interest_tags AS interestTags, youtube_url AS youtubeUrl FROM site_settings WHERE id = 1`).first<typeof defaults>();
  return Response.json({ settings: row || defaults }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PATCH(request: Request) {
  if (!(await isAdmin(request))) return Response.json({ message: '허재혁님만 접근이 가능합니다' }, { status: 401 });
  const body = (await request.json()) as { interestTitle?: unknown; interestTags?: unknown; youtubeUrl?: unknown };
  if (typeof body.youtubeUrl === 'string') {
    const youtubeUrl = body.youtubeUrl.trim();
    const videoId = getYoutubeVideoId(youtubeUrl);
    if (!videoId) return Response.json({ message: '올바른 유튜브 영상 링크를 입력해 주세요.' }, { status: 400 });
    if (youtubeUrl.length > 300) return Response.json({ message: '유튜브 링크는 300자 이내로 입력해 주세요.' }, { status: 400 });
    await env.DB.prepare(`
      INSERT INTO site_settings (id, interest_title, interest_tags, youtube_url, updated_at)
      VALUES (1, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET youtube_url = excluded.youtube_url, updated_at = excluded.updated_at
    `).bind(defaults.interestTitle, defaults.interestTags, youtubeUrl, Date.now()).run();
    const settings = await env.DB.prepare(`SELECT interest_title AS interestTitle, interest_tags AS interestTags, youtube_url AS youtubeUrl FROM site_settings WHERE id = 1`).first<typeof defaults>();
    return Response.json({ settings: settings || { ...defaults, youtubeUrl } });
  }
  const interestTitle = typeof body.interestTitle === 'string' ? body.interestTitle.trim() : '';
  const interestTags = typeof body.interestTags === 'string' ? body.interestTags.trim() : '';
  if (!interestTitle || !interestTags) return Response.json({ message: '관심사와 태그를 모두 입력해 주세요.' }, { status: 400 });
  if (interestTitle.length > 60 || interestTags.length > 80) return Response.json({ message: '관심사는 60자, 태그는 80자 이내로 입력해 주세요.' }, { status: 400 });
  await env.DB.prepare(`
    INSERT INTO site_settings (id, interest_title, interest_tags, youtube_url, updated_at)
    VALUES (1, ?, ?, '', ?)
    ON CONFLICT(id) DO UPDATE SET interest_title = excluded.interest_title, interest_tags = excluded.interest_tags, updated_at = excluded.updated_at
  `).bind(interestTitle, interestTags, Date.now()).run();
  const settings = await env.DB.prepare(`SELECT interest_title AS interestTitle, interest_tags AS interestTags, youtube_url AS youtubeUrl FROM site_settings WHERE id = 1`).first<typeof defaults>();
  return Response.json({ settings: settings || { ...defaults, interestTitle, interestTags } });
}
