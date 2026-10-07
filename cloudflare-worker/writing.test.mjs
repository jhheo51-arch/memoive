import assert from 'node:assert/strict';
import worker from './src/index.js';

const origin='https://test.example';
const env={ALLOWED_ORIGIN:origin,AI_RECORDS_ENABLED:'true',GEMINI_API_KEY:'test-only',GEMINI_MODEL:'test',AI_RATE_LIMITER:{limit:async()=>({success:true})}};
const request=body=>worker.fetch(new Request(origin+'/v1/refine',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)}),env);
const originalFetch=globalThis.fetch;
let sent;
globalThis.fetch=async(_url,options)=>{
  sent=JSON.parse(options.body);
  const reuse=sent.contents[0].parts[0].text.includes('목표: 기록 시작 안내 글을 쓴다.');
  const development=reuse?'기록을 시작할 때는 거창한 결론보다 지금 눈에 들어온 장면을 한 문장으로 남깁니다. 무엇을 보았는지와 왜 멈춰 보게 되었는지를 구분하면 다음에 다시 읽을 단서가 생깁니다. 이어서 그 장면이 기존 생각과 어떻게 다른지 적습니다. 확실하지 않은 부분은 단정하지 않고 질문으로 남깁니다. 이 과정을 반복하면 자료 요약과 내 판단이 섞이지 않습니다. 기록을 다시 펼쳤을 때는 당시의 한 문장, 근거가 된 장면, 아직 남은 질문을 차례로 확인합니다. 첫 기록에는 관찰한 사실을 적고, 두 번째 기록에는 그 사실을 보고 떠오른 해석을 적습니다. 세 번째 기록에는 다음에 확인하고 싶은 질문을 적습니다. 세 문장을 나누면 출처의 주장과 작성자의 의견을 구별하기 쉬워집니다. 글로 옮길 때는 기록의 모든 내용을 나열하지 않고 지금 전달하려는 관점과 직접 연결되는 단서만 고릅니다. 선택한 단서가 관점을 실제로 뒷받침하는지도 원문과 다시 비교합니다. 확인되지 않은 경험이나 성과는 추가하지 않습니다. 독자가 바로 따라 할 안내 글이라면 한 문장을 적는 위치, 관찰과 해석을 나누는 방법, 나중에 다시 찾을 질문을 순서대로 설명합니다. 마지막에는 반드시 성공할 것이라고 단정하지 않고, 어떤 기록이 남았을 때 이 방법이 유용했는지 판단할 수 있는 기준을 제시합니다.': '그 문장에서 출발해 다음 생각을 이어갑니다.';
  return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'제안',lead:'먼저 한 문장을 적어봅니다.',development,closing:'짧은 기록도 한 편의 글이 됩니다.'})}]}}]}));
};
try{
  assert.equal((await request({viewpoint:'',records:[]})).status,400);
  assert.equal((await request({viewpoint:'',reuseProposal:{task:'안내 글'},records:[]})).status,400);
  const thoughtResponse=await request({viewpoint:'오늘 한 문장을 남기고 싶다.',records:[]});
  assert.equal(thoughtResponse.status,200);
  assert.equal((await thoughtResponse.json()).body,'먼저 한 문장을 적어봅니다.\n\n그 문장에서 출발해 다음 생각을 이어갑니다.\n\n짧은 기록도 한 편의 글이 됩니다.');
  assert.match(sent.contents[0].parts[0].text,/오늘 한 문장을 남기고 싶다/);
  assert.match(sent.contents[0].parts[0].text,/lead\(생각의 출발\)/);
  assert.match(sent.contents[0].parts[0].text,/700~1,300자/);
  assert.match(sent.contents[0].parts[0].text,/3~6개 문단/);
  assert.equal(sent.generationConfig.maxOutputTokens,6144);
  assert.deepEqual(Object.keys(sent.generationConfig.responseSchema.properties),['title','lead','development','closing']);
  assert.equal((await request({viewpoint:'',reuseProposal:{task:'기록 시작 안내 글을 쓴다.',deliverable:'안내 글'},records:[{title:'기록 자료',summary:'한 문장씩 기록하는 방법.'}]})).status,200);
  const prompt=sent.contents[0].parts[0].text;
  assert.match(prompt,/직접 작성한 생각: 미작성/);
  assert.match(prompt,/목표: 기록 시작 안내 글을 쓴다/);
  assert.match(prompt,/1인칭 경험, 감정, 성과를 만들지/);
  assert.match(prompt,/같은 말을 세 부분에 반복하지/);
  globalThis.fetch=async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({title:'미완성',lead:'입력을 그대로 반복합니다.',development:'',closing:''})}]}}]}));
  assert.equal((await request({viewpoint:'생각을 충분히 적었는데도 AI가 같은 한 문장만 돌려준다면 완성된 글로 보기 어렵습니다. 짧은 글이어도 앞뒤의 연결이 필요합니다. '.repeat(3),records:[]})).status,502);
  console.log('PASS: empty input guard, source guard, thought-only generation, reuse without invented thought');
}finally{globalThis.fetch=originalFetch;}
