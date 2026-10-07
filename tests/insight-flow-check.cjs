const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const helpers=require('../frontend/js/insight-tools.js');
const app=fs.readFileSync(require.resolve('../frontend/js/app.js'),'utf8');
const body='반복 작업을 자동화하면 업무에 쓰는 시간을 줄일 수 있습니다. '.repeat(4);
const record={id:'one',title:'자동화',sourceBody:body,bodySavedAt:'one',summary:body,thought:'보존'};
assert.notEqual(helpers.basic(record,'기획자').question,helpers.basic(record,'마케터').question);
assert.equal(helpers.basic(record,'기획자').context,'본문 키워드 · 업무 자동화');
assert.ok(helpers.basic(record,'기획자').summary.length<=161);
assert.throws(()=>helpers.validate({summary:'요약',question:'질문',evidence:['없는 원문 문장입니다']},body));
const result={summary:'반복 작업 자동화 사례',question:'어떤 업무부터 시험할까요?',evidence:['반복 작업을 자동화하면 업무에 쓰는 시간을 줄일 수 있습니다.']};
assert.deepEqual(helpers.validate(result,body),result);
record.aiInsights={기획자:{...result,sourceStamp:helpers.stamp(record)}};
assert.ok(helpers.current(record,'기획자'));
record.sourceBody+='변경';assert.equal(helpers.current(record,'기획자'),null);
// Hold an article response, then edit thought/topics while it is in flight.
let resolveFetch;let updates=0;
const current={id:'one',url:'https://example.com',fetchStatus:'reading',thought:'이전',topics:['새로운 기록']};
const context={state:{records:[current]},LinkReader:{fetchArticle:()=>new Promise(r=>resolveFetch=r)},AbortController,setTimeout,clearTimeout,
  applyArticle:(r,p)=>Object.assign(r,{sourceBody:p.content,fetchStatus:'ready'}),
  failedLinkRecord:()=>{},persist:()=>{},renderAll:()=>{},refreshReading:()=>updates++,toast:()=>{}};
vm.createContext(context);
vm.runInContext('const linkJobs=new Map();\n'+app.split('\n').find(l=>l.startsWith('async function finishLinkRecord(')),context);
(async()=>{
  const pending=context.finishLinkRecord(current);
  current.thought='대기 중 새 생각';current.topics=['내 주제'];
  resolveFetch({content:body});await pending;
  assert.equal(current.thought,'대기 중 새 생각');assert.deepEqual(current.topics,['내 주제']);assert.equal(current.sourceBody,body);
  const again=context.finishLinkRecord(current);
  current.bodySavedAt='manual-new';current.sourceBody='직접 저장한 본문';
  resolveFetch({content:'늦게 온 응답'});await again;assert.equal(current.sourceBody,'직접 저장한 본문');
  const gone=context.finishLinkRecord(current);context.state.records=[];resolveFetch({content:body});await gone;
  assert.ok(updates>0);
  console.log('PASS compact display, role/context, evidence validation, stale AI, delayed source preserves thought/topics/manual paste/deleted records');
})().catch(e=>{console.error(e);process.exitCode=1;});
