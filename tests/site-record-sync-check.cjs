const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
let chromium;
try{
  ({chromium}=require(process.env.MEMOIVE_PLAYWRIGHT||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}catch{
  const app=fs.readFileSync(path.join(__dirname,'..','frontend','js','app.js'),'utf8');
  assert.match(app,/const siteDemoRecords=\[/);
  assert.match(app,/AI 전환, 우리가 도운 건 돕는 사람이었습니다/);
  assert.match(app,/function syncSiteDemoRecords\(records,dismissedIds=\[\]\)/);
  assert.match(app,/records:syncSiteDemoRecords\(DataTools\.withExamples/);
  console.log('PASS: public Sites demo record definitions and saved-state migration are wired. Browser check skipped without Playwright.');
  process.exit(0);
}

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.route('https://**/*',route=>route.abort());
    await page.goto('http://127.0.0.1:4182/');
    assert.equal(await page.locator('#home-loading').isHidden(),true);
    assert.equal(await page.locator('.recent').isVisible(),true);
    assert.equal(await page.locator('#home-records [data-record-id]').count(),2);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'기록',exact:true}).click();
    await assertRecordSet(page);
    const typeColors=await page.locator('.filters button:not([data-filter="all"])').evaluateAll(buttons=>buttons.map(button=>getComputedStyle(button).color));
    assert.equal(new Set(typeColors).size,5);
    assert.deepEqual(await page.evaluate(()=>{
      const css=getComputedStyle(document.documentElement);
      return [css.getPropertyValue('--type-video').trim(),css.getPropertyValue('--type-image').trim()];
    }),['#405f9b','#3e765c']);

    await page.locator('#record-list [data-record-id="example-musinsa-experience"]').click();
    assert.equal(await page.locator('#edit-thought').textContent(),'내 생각 다듬기');
    assert.equal(await page.locator('#progress-thought').textContent(),'내 생각 다듬기');
    await page.locator('#edit-thought').click();
    await page.locator('#thought-input').fill('새로고침 뒤에도 남아야 하는 내 생각');
    await page.locator('#save-thought').click();
    assert.equal(await page.locator('#detail-thought').textContent(),'새로고침 뒤에도 남아야 하는 내 생각');
    assert.equal(await page.locator('#edit-thought').textContent(),'내 생각 다듬기');
    await page.reload();
    await page.getByRole('button',{name:'기록',exact:true}).click();
    await page.locator('#record-list [data-record-id="example-musinsa-experience"]').click();
    assert.equal(await page.locator('#detail-thought').textContent(),'새로고침 뒤에도 남아야 하는 내 생각');

    await page.evaluate(()=>{
      const oldRecords=state.records
        .filter(record=>record.id!=='site-woowa-ai-coaching')
        .map(record=>record.id==='example-toss-experiments'?{...record,title:'이전 토스 제목'}:record.id==='example-socar-customer'?{...record,title:'이전 쏘카 제목'}:record);
      localStorage.setItem('memoive-smart-v04-ready',JSON.stringify({version:12,records:oldRecords,outputs:[],analytics:{events:[],ratings:[]}}));
    });
    await page.reload();
    await page.getByRole('button',{name:'기록',exact:true}).click();
    await assertRecordSet(page);
    await page.locator('#record-list [data-record-id="example-musinsa-experience"]').click();
    assert.equal(await page.locator('#detail-thought').textContent(),'새로고침 뒤에도 남아야 하는 내 생각');

    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#delete-record').click();
    assert.equal(await page.locator('#record-list [data-record-id="example-musinsa-experience"]').count(),0);
    await page.evaluate(()=>{
      const stored=JSON.parse(localStorage.getItem('memoive-smart-v04-ready'));
      stored.records.push(siteDemoRecords.find(record=>record.id==='example-musinsa-experience'));
      localStorage.setItem('memoive-smart-v04-ready',JSON.stringify(stored));
    });
    await page.reload();
    await page.getByRole('button',{name:'기록',exact:true}).click();
    assert.equal(await page.locator('#record-list [data-record-id="example-musinsa-experience"]').count(),0);
    await page.evaluate(()=>{
      state.records.push({
        id:'rewritten-musinsa',type:'article',label:'ARTICLE',savedAt:'2026-10-07',sourceDate:'2026.10.07',
        title:'내가 다시 작성한 무신사 기록',source:'직접 다시 작성',
        url:'https://techblog.musinsa.com/무신사-메가스토어-성수-보이지-않는-기술-선명해지는-경험-a1976d599e83',
        summary:'삭제 뒤 새로 작성한 내용',points:['새로 작성한 핵심 내용'],quote:'',thought:'새로 쓴 내 생각',
        topics:['새 기록'],confidence:0,uncertainty:'직접 다시 작성한 시험 기록',evidence:[],revisitOn:'',actions:[]
      });
      persist();
    });
    await page.reload();
    await page.getByRole('button',{name:'기록',exact:true}).click();
    assert.equal(await page.locator('#record-list [data-record-id="example-musinsa-experience"]').count(),0);
    assert.equal(await page.locator('#record-list [data-record-id="rewritten-musinsa"] strong').textContent(),'내가 다시 작성한 무신사 기록');
    console.log('PASS: public records refresh while thoughts, deletion, and a same-URL rewrite survive reload.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});

async function assertRecordSet(page){
  await page.locator('#search-status').waitFor({state:'visible'});
  assert.equal(await page.locator('#search-status').innerText(),'전체 기록 9개 · 최신순');
  const titles=await page.locator('#record-list [data-record-id] strong').allTextContents();
  assert.deepEqual(titles.slice(0,4),[
    'AI 전환, 우리가 도운 건 돕는 사람이었습니다',
    '1,000만 명이 들어와도 999만 명이 나가는 문제, 어떻게 해결했을까 | 언더커버 사일로 비하인드 5화: 계좌 사일로',
    "주니어 PM의 '중요한 고객' 발굴하기",
    '무신사 메가스토어 성수: 보이지 않는 기술, 선명해지는 경험'
  ]);
}
