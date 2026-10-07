(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.ReuseTools=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const str=v=>typeof v==='string'?v:'';
  const roles={reference:'참고 사례',support:'주장을 뒷받침할 후보',counter:'다른 관점·반례 후보',method:'실행 방법 후보'};
  function tokens(s){return [...new Set(str(s).toLowerCase().match(/[가-힣a-z0-9]{2,}/g)||[])].map(t=>t.replace(/(에서는|에게|으로|에서|하는|하기|하고|을|를|은|는|이|가)$/,'')).filter(t=>t.length>1);}
  function rank(records,query,isExample=()=>false){const terms=tokens(query);return records.filter(r=>!isExample(r)).map(r=>{
    const fields=[['제목',r.title],['내 생각',r.thought],['주제',(r.topics||[]).join(' ')],['저장한 내용',[r.summary,r.sourceBody].join(' ')]];
    const matches=fields.map(([label,value])=>({label,terms:terms.filter(t=>str(value).toLowerCase().includes(t))})).filter(x=>x.terms.length);
    const body=str(r.sourceBody),at=terms.reduce((found,t)=>{const i=body.toLowerCase().indexOf(t);return i>=0&&(found<0||i<found)?i:found;},-1);
    return {record:r,excerpt:at<0?'':body.slice(Math.max(0,at-45),Math.min(body.length,at+195)),score:matches.reduce((n,m)=>n+m.terms.length*(m.label==='내 생각'?3:1),0),reason:matches.map(m=>`${m.label}에 ‘${m.terms.slice(0,3).join('·')}’ 포함`).join(' · ')};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||str(b.record.capturedAt||b.record.savedAt).localeCompare(str(a.record.capturedAt||a.record.savedAt)));}
  function traceStatus(trace,body,records){const record=records.find(r=>r.id===trace.recordId);if(!body.includes(trace.claim))return '결과물 문장이 바뀜 · 다시 연결 필요';if(!record)return '원래 기록 없음 · 보관한 발췌만 확인 가능';if(!record.sourceBody?.includes(trace.quote))return '현재 본문에서 발췌 확인 불가';return '본문에서 발췌 확인 · 주장 타당성은 직접 확인';}
  function makeTrace(record,claim,quote,body,kind='source'){
    if(!claim.trim()||!body.includes(claim))throw Error('결과물에 실제로 있는 문장을 선택해 주세요.');
    if(!quote.trim()||!record?.sourceBody?.includes(quote))throw Error('저장된 본문에서 그대로 가져온 구절만 연결할 수 있어요.');
    return {id:crypto.randomUUID(),recordId:record.id,title:record.title,url:record.url||'',claim,quote,kind:['source','interpretation','thought'].includes(kind)?kind:'source',at:new Date().toISOString()};
  }
  function cleanTraces(value){return Array.isArray(value)?value.filter(t=>t&&str(t.id)&&str(t.recordId)&&str(t.claim)&&str(t.quote)).map(t=>({id:str(t.id),recordId:str(t.recordId),title:str(t.title),url:str(t.url),claim:str(t.claim),quote:str(t.quote),kind:['source','interpretation','thought'].includes(t.kind)?t.kind:'source',at:str(t.at)})):[];}
  function cleanWorkspaces(value){if(value===undefined)return [];if(!Array.isArray(value)||value.some(w=>!w||!str(w.id)))throw Error('이어 쓰기 자료를 읽지 못했어요. 기존 저장본을 보존합니다.');return value.map(w=>({
    id:w.id,outputId:str(w.outputId),updatedAt:str(w.updatedAt),name:str(w.name),purpose:str(w.purpose),viewpoint:str(w.viewpoint),type:['social_post','social_story','article','brunch','proposal','project','idea'].includes(w.type)?w.type:'proposal',tone:['insight','friendly','clear'].includes(w.tone)?w.tone:'clear',title:str(w.title),body:str(w.body),draftOrigin:['ai','basic'].includes(w.draftOrigin)?w.draftOrigin:'unknown',used:Boolean(w.used),useNote:str(w.useNote),shareFormat:w.shareFormat==='story'?'story':'post',
    selected:Array.isArray(w.selected)?w.selected.filter(x=>typeof x==='string'):[],decisions:Object.fromEntries(Object.entries(w.decisions||{}).filter(([,v])=>v&&typeof v==='object').map(([k,v])=>[k,{excluded:!!v.excluded,role:roles[v.role]?v.role:'reference',note:str(v.note)}])),traces:cleanTraces(w.traces),reusedThoughts:Array.isArray(w.reusedThoughts)?w.reusedThoughts.filter(x=>typeof x==='string'):[]
  }));}
  return {roles,tokens,rank,traceStatus,makeTrace,cleanTraces,cleanWorkspaces};
});
