import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
// A fresh server and temporary browser profiles isolate these tests from user data.
const server=http.createServer(async(req,res)=>{
  try{
    const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
    const file=path.resolve(root,relative);
    if(!file.startsWith(root)||relative.split('/').some(p=>p.startsWith('.'))||!types[path.extname(file)]){res.writeHead(404);res.end();return;}
    const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
  for(const name of ['capture-reset-check.cjs','site-record-sync-check.cjs']){
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['tests/'+name],{cwd:root,stdio:'inherit',env:{...process.env,MEMOIVE_TEST_BASE_URL:`http://127.0.0.1:${server.address().port}`},timeout:60000});
      child.once('error',reject);
      child.once('exit',(code,signal)=>code===0?resolve():reject(new Error(`${name} failed: ${code??signal}`)));
    });
  }
  console.log('PASS: both required browser checks executed against this checkout; no live AI calls.');
}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
