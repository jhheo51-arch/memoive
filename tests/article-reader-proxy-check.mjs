import assert from 'node:assert/strict';
import articleApi, {readArticle} from '../api/article-reader.mjs';

const articleUrl='https://techblog.musinsa.com/%EB%AC%B4%EC%8B%A0%EC%82%AC-%EB%A9%94%EA%B0%80%EC%8A%A4%ED%86%A0%EC%96%B4-%EC%84%B1%EC%88%98-a1976d599e83';
const feed=`<?xml version="1.0"?><rss><channel><item>
  <title><![CDATA[무신사 메가스토어 성수: 보이지 않는 기술]]></title>
  <link>${articleUrl}</link><pubDate>Mon, 04 May 2026 00:00:00 GMT</pubDate>
  <content:encoded><![CDATA[<p>좋은 기술은 드러나지 않아야 합니다.</p><p>${'공개 본문을 안전한 피드에서 확인합니다. '.repeat(5)}</p>]]></content:encoded>
</item></channel></rss>`;
const calls=[];
const ok=await readArticle(new Request(`https://memoive.vercel.app/api/article-reader?url=${encodeURIComponent(articleUrl)}`),async url=>{
  calls.push(url);
  return new Response(calls.length===1?'<?xml version="1.0"?><rss><channel></channel></rss>':feed,{status:200});
});
assert.equal(ok.status,200);
const data=await ok.json();
assert.equal(data.title,'무신사 메가스토어 성수: 보이지 않는 기술');
assert.match(data.contentHtml,/좋은 기술은 드러나지 않아야/);
assert.equal(calls[1],'https://techblog.musinsa.com/feed/tagged/retail');
assert.match(ok.headers.get('cache-control'),/s-maxage=86400/);

const blocked=await readArticle(new Request(`https://memoive.vercel.app/api/article-reader?url=${encodeURIComponent('https://example.com/post-a1976d599e83')}`),async()=>{throw new Error('must not fetch');});
assert.equal(blocked.status,400);
const method=await articleApi.fetch(new Request(`https://memoive.vercel.app/api/article-reader?url=${encodeURIComponent(articleUrl)}`,{method:'POST'}));
assert.equal(method.status,405);
console.log('PASS: Vercel article reader uses fixed public Musinsa feeds, validates URLs, and caches successful reads');
