const assert=require('node:assert/strict');
let chromium;
try{
  ({chromium}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
}catch{
  console.log('SKIP: capture reset browser check needs the local Codex Playwright runtime.');
  process.exit(0);
}

(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  try{
    await page.goto('http://127.0.0.1:4182/');
    await page.evaluate(()=>{finishLinkRecord=async()=>{}});
    await page.evaluate(()=>openSheet('#capture-sheet'));
    await page.locator('#capture-link').fill('invalid-address');
    await page.locator('#capture-note').fill('저장 실패 시 남겨야 할 생각');
    await page.locator('#capture-submit').click();
    assert.equal(await page.locator('#capture-link').inputValue(),'invalid-address');
    assert.equal(await page.locator('#capture-note').inputValue(),'저장 실패 시 남겨야 할 생각');

    const url='https://example.com/memoive-capture-reset-check';
    await page.locator('#capture-link').fill(url);
    await page.locator('#capture-submit').click();
    await page.waitForFunction(url=>state.records.some(record=>record.url===url),url);
    assert.equal(await page.locator('#capture-link').inputValue(),'');
    assert.equal(await page.locator('#capture-note').inputValue(),'');
    assert.equal(await page.evaluate(()=>state.captureType),'link');

    await page.evaluate(()=>{$('#detail-view').classList.remove('active');openSheet('#capture-sheet')});
    assert.equal(await page.locator('#capture-link').inputValue(),'');
    await page.evaluate(()=>selectCaptureType('text'));
    await page.locator('#capture-text').fill('새로 남길 글');
    await page.locator('#capture-note').fill('새 생각');
    await page.locator('#capture-submit').click();
    await page.waitForFunction(()=>state.records.some(record=>record.sourceBody==='새로 남길 글'));
    assert.equal(await page.locator('#capture-text').inputValue(),'');
    assert.equal(await page.locator('#capture-note').inputValue(),'');
    assert.equal(await page.evaluate(()=>state.captureType),'link');
    console.log('PASS: invalid input remains; saved link and text reset all capture fields');
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
