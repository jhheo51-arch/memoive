import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createSyncHandler} from '../api/sync.mjs';

// In-memory database substitute. No production credentials or network requests.
const token='synthetic-sync-conflict-test-token';
process.env.MEMOIVE_SYNC_SECRET_SHA256=createHash('sha256').update(token).digest('hex');
const state=id=>({records:[{id,title:id,topics:[]}],outputs:[]});
function fixture(initial=null){
  let row=structuredClone(initial);
  const client={from(){return {
    insert(value){return {select(){return {async single(){
      if(row)return {data:null,error:{code:'23505'}};
      row=structuredClone(value);return {data:row,error:null};
    }}}};},
    update(value){const filters={};return {
      eq(key,expected){filters[key]=expected;return this;},select(){return this;},
      async maybeSingle(){
        if(!row||Object.entries(filters).some(([key,expected])=>row[key]!==expected))return {data:null,error:null};
        row={...row,...structuredClone(value)};return {data:row,error:null};
      }
    };}
  };}};
  return {handler:createSyncHandler({createClient:()=>client}),row:()=>structuredClone(row)};
}
const put=(id,etag,auth=token)=>new Request('https://synthetic.invalid/api/sync',{
  method:'PUT',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json',...(etag===undefined?{}:{'If-Match':etag})},body:JSON.stringify(state(id))
});
const original={id:'owner',payload:state('original'),version:7};
const saved=fixture(original);
assert.equal((await saved.handler.fetch(put('stale'))).status,412);
assert.deepEqual(saved.row(),original,'Missing version must never overwrite existing records');
for(const etag of ['', 'v0','v-1','v1x','v01','v9007199254740992']){
  assert.equal((await saved.handler.fetch(put('invalid',etag))).status,400);
  assert.deepEqual(saved.row(),original);
}
assert.equal((await saved.handler.fetch(put('stale','v6'))).status,412);
assert.deepEqual(saved.row(),original);
const updated=await saved.handler.fetch(put('updated','v7'));
assert.equal(updated.status,200);assert.equal((await updated.json()).syncEtag,'v8');
assert.equal(saved.row().payload.records[0].id,'updated');
assert.equal((await saved.handler.fetch(put('another-tab','v7'))).status,412);
assert.equal(saved.row().version,8);
assert.equal((await saved.handler.fetch(put('unauthorized','v8','wrong'))).status,401);
assert.equal(saved.row().payload.records[0].id,'updated');
const empty=fixture();
const competing=await Promise.all([empty.handler.fetch(put('device-a')),empty.handler.fetch(put('device-b'))]);
assert.deepEqual(competing.map(r=>r.status).sort(),[200,412]);
assert.equal(empty.row().version,1);
assert.ok(['device-a','device-b'].includes(empty.row().payload.records[0].id));
console.log('PASS: create-only save, concurrent initialization, missing/invalid/stale versions, valid update and owner authorization; synthetic database only.');
