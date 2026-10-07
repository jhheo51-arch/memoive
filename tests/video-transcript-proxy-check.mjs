import assert from 'node:assert/strict';
import transcriptApi, {readTranscript} from '../api/youtube-transcript.mjs';

const id='Aj2a5Ru2vMA';
const transcript=`# Transcript: 주문까지 3초\n\nSource video: https://www.youtube.com/watch?v=${id}\n\n## Transcript\n[0:10] 공개 자막으로 영상의 핵심 내용을 확인합니다.`;
const ok=await readTranscript(new Request(`https://memoive.vercel.app/api/youtube-transcript?id=${id}`),async url=>{
  assert.equal(url,`https://youtube-transcript.ai/transcript/${id}.txt`);
  return new Response(transcript,{status:200});
});
assert.equal(ok.status,200);
assert.equal(await ok.text(),transcript);
assert.match(ok.headers.get('cache-control'),/s-maxage=86400/);

const invalid=await readTranscript(new Request('https://memoive.vercel.app/api/youtube-transcript?id=bad'),async()=>{throw new Error('must not fetch');});
assert.equal(invalid.status,400);

const unexpected=await readTranscript(new Request(`https://memoive.vercel.app/api/youtube-transcript?id=${id}`),async()=>new Response('<html>not a transcript</html>',{status:200}));
assert.equal(unexpected.status,502);

const method=await transcriptApi.fetch(new Request(`https://memoive.vercel.app/api/youtube-transcript?id=${id}`,{method:'POST'}));
assert.equal(method.status,405);
console.log('PASS: Vercel transcript proxy validates video IDs, transcript shape, caching, and methods');
