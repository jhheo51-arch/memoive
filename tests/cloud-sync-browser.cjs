const assert=require('node:assert/strict');
const {chromium}=require(process.env.MEMOIVE_PLAYWRIGHT||'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  let saved=null;
  await page.route('**/api/sync',async route=>{
    const request=route.request();
    if(request.method()==='GET')return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({
      records:[{id:'cloud-one',type:'article',title:'클라우드 기준 기록',topics:[],savedAt:'2026-10-07',summary:'동기화 시험'}],
      outputs:[],dismissedExampleIds:[],analytics:{events:[]},role:'기획자',resurface:true,reminderFrequency:'3',reminderTime:'07:00',syncEtag:'etag-1'
    })});
    saved=request.postDataJSON();
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({ok:true,syncEtag:'etag-2',records:saved.records.length,outputs:saved.outputs.length})});
  });
  try{
    await page.goto('http://127.0.0.1:4182/');
    await page.locator('#open-profile').click();
    await page.locator('#open-data-vault').click();
    await page.locator('#cloud-sync-code').fill('memoive-test-owner-token');
    await page.locator('#cloud-sync-connect').click();
    await page.locator('#cloud-sync-status').getByText(/클라우드 기록 \d+개를 불러왔어요/).waitFor();
    await page.evaluate(()=>{state.records.push({id:'new-local',type:'text',title:'새 기록',topics:[],savedAt:'2026-10-07'});persist()});
    await page.waitForTimeout(1500);
    assert.ok(saved.records.some(record=>record.id==='new-local'));
    assert.match(await page.locator('#cloud-sync-status').innerText(),/클라우드 저장 완료/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    console.log('PASS: owner connection loads cloud state and later changes are saved without mobile overflow.');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
