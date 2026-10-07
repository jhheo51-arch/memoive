const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
let sent=0;
const context={AI_ENDPOINT:'https://worker.test/v1/refine',window:{memoiveConfirm:async()=>false},AbortController,setTimeout,clearTimeout,fetch:async()=>{sent++;return Response.json({title:'초안',body:'본문'});}};
vm.createContext(context);
vm.runInContext(source.split('\n').find(line=>line.startsWith('async function requestAiDraft(')),context);
(async()=>{
 await assert.rejects(context.requestAiDraft({records:[]}),error=>error.code==='AI_CANCELLED');
 assert.equal(sent,0);
 context.window.memoiveConfirm=async text=>{assert.ok(text.includes('내 생각'));assert.ok(text.includes('Google'));return true;};
 const result=await context.requestAiDraft({records:[]});assert.equal(result.title,'초안');assert.equal(sent,1);
 console.log('PASS creator consent: cancel sends nothing; accept sends once. Synthetic test only.');
})().catch(e=>{console.error(e);process.exitCode=1;});
