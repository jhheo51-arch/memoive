import assert from 'node:assert/strict';
import { authorized, validateSyncState } from '../api/sync.mjs';

const state={records:[{id:'r1',title:'기록',topics:[]}],outputs:[{id:'o1',title:'결과물'}]};
assert.equal(validateSyncState(state),state);
assert.throws(()=>validateSyncState({records:[{id:'r1',title:'기록',topics:[]},{id:'r1',title:'중복',topics:[]}],outputs:[]}));
assert.throws(()=>validateSyncState({records:[],outputs:[{id:'o1',title:'결과물'},{id:'o1',title:'중복'}]}));

const token='memoive-test-owner-token';
const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
const expected=[...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('');
assert.equal(await authorized(new Request('https://memoive.vercel.app/api/sync',{headers:{Authorization:`Bearer ${token}`}}),expected),true);
assert.equal(await authorized(new Request('https://memoive.vercel.app/api/sync',{headers:{Authorization:'Bearer wrong'}}),expected),false);

console.log('PASS: cloud sync validates unique records and authenticates the owner token.');
