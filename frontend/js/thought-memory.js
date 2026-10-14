/* P2 ⑥ — bring a past thought back and let the person add today's thought beside it. */
(()=>{
  // Extensions must never break saving or opening records; failures are logged, not thrown.
  const safely=fn=>{try{fn();}catch(error){console.error('[MEMOIVE]',error);}};
  const SNOOZE_KEY='memoive-memory-snooze-v1',shown=new Set();
  const snoozed=()=>{try{const v=JSON.parse(localStorage.getItem(SNOOZE_KEY)||'null');return v?.date===TODAY?v.ids:[]}catch{return[]}};
  const snooze=id=>{try{localStorage.setItem(SNOOZE_KEY,JSON.stringify({date:TODAY,ids:[...snoozed(),id]}))}catch{}};
  const dot=day=>String(day||'').replaceAll('-','.');
  const baseText=record=>record.thoughts.filter(e=>e.kind!=='followup').map(e=>e.sections.map(s=>s.text).filter(Boolean).join(' ')).filter(Boolean).join(' / ');
  const perspectiveName=()=>(PerspectiveTools.find(state.perspectiveId,state.perspectives)||PerspectiveTools.BUILTIN[0]);

  /* Home: anniversaries first, then the existing "revisit on" record; both can be snoozed or turned off. */
  const card=$('#resurface-card'),actions=document.createElement('div');
  actions.className='memory-actions';
  actions.innerHTML='<button type="button" data-memory="followup">지금 생각 덧붙이기</button><button type="button" data-memory="later">나중에</button><button type="button" data-memory="off">다시 보지 않기</button>';
  $('#resurface-record').after(actions);
  const originalRenderHome=renderHome;
  renderHome=function(){
    originalRenderHome();
    safely(renderMemory);
  };
  function renderMemory(){
    const skip=snoozed(),memory=state.resurface?ReflectionTools.memoryOfTheDay(state.records,TODAY,{isExample:DataTools.isExample,skip}):null;
    const button=$('#resurface-record');
    if(memory){
      const r=memory.record;
      card.classList.remove('hidden');
      $('#resurface-date').textContent=memory.label;
      button.dataset.recordId=r.id;
      button.innerHTML=`${recordVisual(r,'record-symbol')}<span><strong>${esc(r.title)}</strong><small>그때의 생각 · ${esc(baseText(r)||r.thought)}</small></span><b>→</b>`;
      if(!shown.has(r.id)){shown.add(r.id);track('memory_shown',{recordId:r.id,type:r.type,value:String(memory.days)});}
    }
    const current=state.records.find(r=>r.id===button.dataset.recordId);
    const due=memory||(current?.revisitOn&&current.revisitOn<=TODAY);
    // An existing "revisit on" record that was snoozed or turned off is not shown again.
    if(!memory&&current&&(current.resurfaceOff||skip.includes(current.id)))card.classList.add('hidden');
    actions.hidden=!due||card.classList.contains('hidden');
    bindRecordButtons();
  }
  actions.onclick=event=>{
    const action=event.target.closest('[data-memory]')?.dataset.memory,record=state.records.find(r=>r.id===$('#resurface-record').dataset.recordId);
    if(!action||!record)return;
    if(action==='followup'){openRecord(record.id);openFollowup();return;}
    if(action==='later'){snooze(record.id);track('memory_snoozed',{recordId:record.id,type:record.type});renderHome();return toast('오늘은 다시 보여드리지 않을게요.');}
    record.resurfaceOff=true;
    try{persist();}catch{record.resurfaceOff=false;return;}
    track('memory_dismissed',{recordId:record.id,type:record.type});
    renderHome();toast('이 기록은 더 이상 다시 꺼내드리지 않아요.');
  };

  /* Record detail: the thought's history in time order, plus adding today's thought. */
  const section=$('.my-thought'),flow=document.createElement('div');
  flow.id='thought-flow';
  section.append(flow);
  function renderFlow(record){
    const followups=record.thoughts.filter(e=>e.kind==='followup').sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    const first=record.thoughts.filter(e=>e.kind!=='followup');
    const firstDay=first.map(e=>DataTools.localDay(e.createdAt)).filter(Boolean).sort()[0]||record.savedAt;
    const items=followups.length?[{day:firstDay,label:'처음 생각',text:baseText(record)},...followups.map(e=>({day:DataTools.localDay(e.createdAt),label:e.perspectiveName?`${e.perspectiveName} 관점에서 덧붙임`:'덧붙임',text:e.sections[0].text}))].filter(item=>item.text):[];
    flow.innerHTML=`${items.length?`<p class="eyebrow">생각의 흐름</p><ol class="thought-timeline">${items.map(item=>`<li><time datetime="${esc(item.day)}">${esc(dot(item.day))}</time><small>${esc(item.label)}</small><p>${esc(item.text)}</p></li>`).join('')}</ol>`:''}
    ${record.thoughts.length?`<form id="followup-form" hidden><label for="followup-input">지금은 어떻게 생각하나요?<small>이전 생각은 그대로 두고 오늘 날짜로 덧붙여요.</small></label><textarea id="followup-input" rows="3"></textarea><div><button type="submit" class="primary">덧붙이기</button><button type="button" id="followup-cancel">취소</button></div></form><button type="button" id="open-followup" class="thought-add">+ 지금 생각 덧붙이기</button>`:''}`;
    const form=$('#followup-form');if(!form)return;
    $('#open-followup').onclick=openFollowup;
    $('#followup-cancel').onclick=()=>{form.hidden=true;$('#open-followup').hidden=false;};
    form.onsubmit=event=>{
      event.preventDefault();
      const value=$('#followup-input').value.trim();if(!value)return toast('한 문장만 남겨주세요.');
      const p=perspectiveName(),before={thoughts:record.thoughts,thought:record.thought};
      Object.assign(record,DataTools.appendFollowup(record,{perspectiveId:p.id,perspectiveName:p.name,text:value}));
      try{persist();}catch{Object.assign(record,before);return;}
      track('thought_followup',{recordId:record.id,type:record.type,value:p.builtin?p.id:'custom'});
      openRecord(record.id,{trackOpen:false});toast('오늘의 생각을 덧붙였어요. 이전 생각은 그대로예요.');
    };
  }
  function openFollowup(){
    const form=$('#followup-form');if(!form)return toast('먼저 이 기록에 생각을 남겨 주세요.');
    form.hidden=false;$('#open-followup').hidden=true;
    requestAnimationFrame(()=>{form.scrollIntoView({block:'center'});$('#followup-input').focus();});
  }
  const originalOpenRecord=openRecord;
  openRecord=function(id,options){originalOpenRecord(id,options);const record=state.records.find(r=>r.id===id);if(record&&state.currentId===id)safely(()=>renderFlow(record));};
  renderHome();
})();
