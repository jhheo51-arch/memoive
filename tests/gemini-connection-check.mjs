import assert from 'node:assert/strict';
import worker from '../cloudflare-worker/src/index.js';
const origin='https://memoive-private-20260926.sooyeon-jun-0389.chatgpt.site';
const env={ALLOWED_ORIGIN:origin,AI_RECORDS_ENABLED:'true',GEMINI_API_KEY:'synthetic-key',GEMINI_MODEL:'test-model',AI_RATE_LIMITER:{limit:async()=>({success:true})}};
const payload={viewpoint:'작은 실험을 먼저 하자',records:[{title:'합성 기록',summary:'합성 요약'}]};
const req=(body=JSON.stringify(payload),headers={Origin:origin,'Content-Type':'application/json'})=>new Request('https://worker.test/v1/refine',{method:'POST',headers,body});
let calls=0; const oldFetch=globalThis.fetch;
globalThis.fetch=async()=>{calls++;return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'실험',lead:'작게 시험한다.',development:'결과를 기록한다.',closing:'돌아본다.'})}]}}]});};
try {
  assert.equal((await worker.fetch(req(),{...env,AI_RECORDS_ENABLED:'false'})).status,503);
  assert.equal((await worker.fetch(req(),{...env,AI_RATE_LIMITER:null})).status,503);
  assert.equal((await worker.fetch(req('{}',{Origin:'https://other.test','Content-Type':'application/json'}),env)).status,403);
  assert.equal((await worker.fetch(req('x'.repeat(100001)),env)).status,413);
  assert.equal((await worker.fetch(req('null'),env)).status,400);
  assert.equal((await worker.fetch(req(),{...env,AI_RATE_LIMITER:{limit:async()=>({success:false})}})).status,429);
  assert.equal(calls,0);
  const response=await worker.fetch(req(),env);assert.equal(response.status,200);assert.equal((await response.json()).body,['작게 시험한다.','결과를 기록한다.','돌아본다.'].join('\n\n'));  globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]});
  assert.equal((await worker.fetch(req(),env)).status,502);
  console.log('PASS refine origin, kill switch, required limiter, real byte cap, null input, quota guard, complete output only. Mock data only.');
} finally {globalThis.fetch=oldFetch;}
