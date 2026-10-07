import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
function run(args){const r=spawnSync(process.execPath,args,{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
for(const name of readdirSync('frontend/js').filter(n=>n.endsWith('.js')))run(['--check','frontend/js/'+name]);
run(['--check','tools/self-test/self-test.js']);
run(['--check','sw.js']);
for(const name of readdirSync('api').filter(n=>n.endsWith('.mjs')))run(['--check','api/'+name]);
for(const name of readdirSync('cloudflare-worker/src'))run(['--check','cloudflare-worker/src/'+name]);
for(const name of readdirSync('tests').filter(n=>/-check\.(cjs|mjs)$/.test(n)).sort())run(['tests/'+name]);
console.log('All synthetic MEMOIVE checks passed; no live Gemini requests.');
