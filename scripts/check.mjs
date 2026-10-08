import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
for(const name of readdirSync('frontend/js').filter(n=>n.endsWith('.js')))run(['--check','frontend/js/'+name]);
run(['--check','tools/self-test/self-test.js']);
run(['--check','sw.js']);
for(const name of readdirSync('api').filter(n=>n.endsWith('.mjs')))run(['--check','api/'+name]);
for(const name of readdirSync('cloudflare-worker/src'))run(['--check','cloudflare-worker/src/'+name]);
const browserChecks=new Set(['capture-reset-check.cjs','site-record-sync-check.cjs']);
for(const name of readdirSync('tests').filter(n=>/-check\.(cjs|mjs)$/.test(n)&&!browserChecks.has(n)).sort())run(['tests/'+name]);
console.log('Synthetic checks passed; browser checks run separately with npm run test:browser. No live Gemini requests.');
