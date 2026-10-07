const assert = require('node:assert/strict');
const fs = require('node:fs');
const D = require('../data-tools.js');
const records = [
  {id:'older',title:'old',savedAt:'2026-09-30',thought:'보존'},
  {id:'morning',title:'am',savedAt:'2026-10-01',capturedAt:'2026-10-01T09:00:00+09:00'},
  {id:'legacy-a',title:'legacy',savedAt:'2026-10-01'},
  {id:'evening',title:'pm',savedAt:'2026-10-01',capturedAt:'2026-10-01T10:00:00Z'},
  {id:'legacy-b',title:'legacy',savedAt:'2026-10-01',capturedAt:'invalid'}
];
const snapshot = JSON.stringify(records);
assert.deepEqual(D.sortRecords(records).map(r=>r.id), ['evening','morning','legacy-a','legacy-b','older']);
assert.equal(JSON.stringify(records),snapshot);
const restored = D.validateBackup(JSON.stringify({records}));
assert.equal(restored.records[1].capturedAt,'2026-10-01T00:00:00.000Z');
assert.equal(restored.records[4].capturedAt,'');
assert.deepEqual(D.sortRecords(restored.records).map(r=>r.id),D.sortRecords(records).map(r=>r.id));
assert.equal(D.mergeRecords(records,[])[0].id,'evening');
assert.equal(D.mergeRecords(records,[]).find(r=>r.id==='older').thought,'보존');
const html = fs.readFileSync(require.resolve('../index.html'),'utf8');
const nav = html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)[0];
assert.equal((nav.match(/<svg /g)||[]).length,5);
assert.equal((nav.match(/aria-hidden="true"/g)||[]).length,5);
assert.ok(nav.includes('aria-current="page"'));
assert.ok(nav.includes('aria-label="새 기록 추가"'));
const app = fs.readFileSync(require.resolve('../app.js'),'utf8');
assert.ok(app.includes('function renderAll(){state.records=DataTools.sortRecords(state.records)'));
assert.ok(app.includes('capturedAt:new Date().toISOString()'));
const go = app.match(/^function go\(screen\).+$/m)[0];
const buttons = ['home','library','studio','calendar'].map(name=>({dataset:{go:name},classList:{toggle(){}},setAttribute(k,v){this[k]=v},removeAttribute(k){delete this[k]}}));
const el={classList:{toggle(){}},focus(){},scrollIntoView(){}};
require('node:vm').runInNewContext(go+";go('library')",{
  state:{},$:()=>el,$$:selector=>selector.includes('bottom-nav')?buttons:[],
  renderHome(){},renderLibrary(){},renderTopics(){},renderCalendar(){},renderInsights(){},renderStudio(){},
  window:{scrollTo(){}},requestAnimationFrame:fn=>fn()
});
assert.deepEqual(buttons.map(b=>b['aria-current']),[undefined,'page',undefined,undefined]);
console.log('PASS: newest date/time, legacy stable order, backup preservation, 5 accessible vector controls. Synthetic fixtures only.');
