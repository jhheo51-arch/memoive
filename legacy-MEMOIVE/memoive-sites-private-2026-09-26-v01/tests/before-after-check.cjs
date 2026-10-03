// Synthetic regression fixture, not a human usability test or business result.
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const base='990d77e00f1f0faee4a2c1c6fb6f7fce79681af5';
const oldSource=file=>execFileSync('git',['show',`${base}:dist/${file}`],{encoding:'utf8'});
const context={module:{exports:{}},URL};vm.runInNewContext(oldSource('data-tools.js'),context);
const oldData=context.module.exports,newData=require('../dist/data-tools.js');
const record={id:'real-fixture',type:'text',title:'샘플 제목',summary:'원문 핵심 내용',thought:'개인 의견은 따로',topics:['검증'],points:['재탐색에 필요한 핵심어'],evidence:[]};
const oldSearch=oldSource('app.js').match(/^function filteredRecords\(\).+$/m)[0];
const newSearch=fs.readFileSync(require.resolve('../dist/app.js'),'utf8').match(/^function filteredRecords\(\).+$/m)[0];
function search(fn){return vm.runInNewContext(fn+'\nfilteredRecords().length',{state:{query:'핵심어',filter:'all',records:[record]},DataTools:newData});}
assert.equal(search(oldSearch),0);assert.equal(search(newSearch),1);
const all=[record,...['daangn-dangbeoni','design-memory','voice-capture','image-timeline','text-question'].map(id=>({...record,id}))];
assert.equal(oldData.analyticsSummary(all,[]).total,6);assert.equal(newData.analyticsSummary(all,[]).total,1);
const args={records:[record],type:'social_post',viewpoint:'최종 관점'};
assert.ok(oldData.buildDraft(args).body.includes('기록에서 확인한 것\n- 개인 의견은 따로'));
assert.ok(!newData.buildDraft(args).body.includes('기록에서 확인한 것\n- 개인 의견은 따로'));
assert.ok(newData.buildDraft(args).body.includes('원문 핵심 내용'));
console.log('PASS: baseline→current / evidence-only keyword: 0→1 match; sample-inclusive total: 6→1 actual fixture; source section using personal opinion: yes→no. Synthetic technical fixtures, not human validation.');
