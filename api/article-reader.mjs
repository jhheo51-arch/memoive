const MUSINSA_HOST = 'techblog.musinsa.com';
const POST_ID = /-([a-f0-9]{12})\/?$/i;
const FEEDS = [
  'https://techblog.musinsa.com/feed',
  'https://techblog.musinsa.com/feed/tagged/retail'
];

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      ...headers
    }
  });
}

function unwrap(value = '') {
  return value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
}

function tag(item, name) {
  return unwrap(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] || '');
}

function findPost(xml, postId) {
  for (const match of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const link = tag(item, 'link');
    if (!link.includes(postId)) continue;
    const contentHtml = tag(item, 'content:encoded') || tag(item, 'description');
    if (contentHtml.length < 80) return null;
    return {title:tag(item, 'title'), published:tag(item, 'pubDate'), contentHtml, url:link, method:'publisher-feed'};
  }
  return null;
}

export async function readArticle(request, fetcher = fetch) {
  let target;
  try { target = new URL(new URL(request.url).searchParams.get('url') || ''); }
  catch { return json({message:'유효한 글 주소가 아니에요.'}, 400); }
  const postId = target.pathname.match(POST_ID)?.[1] || '';
  if (target.protocol !== 'https:' || target.hostname !== MUSINSA_HOST || !postId) {
    return json({message:'지원하는 공개 글 주소가 아니에요.'}, 400);
  }

  try {
    for (const feed of FEEDS) {
      const upstream = await fetcher(feed, {headers:{Accept:'application/rss+xml'}, signal:AbortSignal.timeout(15000)});
      if (!upstream.ok) continue;
      const found = findPost(await upstream.text(), postId);
      if (found) return json(found, 200, {'Cache-Control':'public, s-maxage=86400, stale-while-revalidate=604800'});
    }
    return json({message:'공개 피드에서 이 글을 찾지 못했어요.'}, 404);
  } catch {
    return json({message:'공개 글 확인 시간이 초과됐어요.'}, 504);
  }
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') return json({message:'GET 요청만 사용할 수 있어요.'}, 405, {Allow:'GET'});
    return readArticle(request);
  }
};
