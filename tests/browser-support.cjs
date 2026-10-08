const {chromium}=require('playwright');
const baseURL=process.env.MEMOIVE_TEST_BASE_URL;
if(!baseURL)throw new Error('Run npm run test:browser to start the isolated test server.');
module.exports={chromium,baseURL,async blockExternal(page){
  await page.route('**/*',route=>new URL(route.request().url()).origin===baseURL?route.continue():route.abort());
}};
