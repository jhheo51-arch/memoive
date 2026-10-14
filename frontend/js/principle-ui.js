/* P2 ⑤ — "my principles": one sentence the person writes, linked to the records it came from. */
(()=>{
  // Extensions must never break saving or opening records; failures are logged, not thrown.
  const safely=fn=>{try{fn();}catch(error){console.error('[MEMOIVE]',error);}};
  const R=ReflectionTools;
  const dot=iso=>DataTools.localDay(iso).replaceAll('-','.');
  const safePersist=()=>{try{persist();return true}catch{return false}};

  /* Studio list. */
  const studio=document.createElement('section');
  studio.className='principles';studio.setAttribute('aria-labelledby','principles-title');
  studio.innerHTML='<div class="section-head"><div><p class="eyebrow">MY PRINCIPLES</p><h2 id="principles-title">나의 원칙</h2></div><button type="button" id="new-principle">+ 원칙 만들기</button></div><p class="principles-note">여러 기록에서 반복해서 남긴 생각을 내가 일할 때 쓰는 한 문장으로 묶어요. 근거 기록이 2개 이상이면 원칙, 그보다 적으면 초안이에요.</p><div id="principle-list"></div>';
  $('.studio-progress').after(studio);
  function renderPrinciples(){
    const list=[...state.principles].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));
    $('#principle-list').innerHTML=list.length?list.map(p=>{const s=R.principleStatus(p,state.records);return `<button type="button" class="principle-card" data-principle-id="${esc(p.id)}"><strong>${esc(p.statement)}</strong><small>${s.draft?'<em>초안</em> · ':''}근거 기록 ${s.live.length}개${s.missing.length?` · 삭제된 근거 ${s.missing.length}개`:''} · ${esc(dot(p.updatedAt))} 수정</small></button>`}).join(''):'<p class="principle-empty">아직 원칙이 없어요. 기록 두 개 이상에 남긴 생각이 이어진다면 원칙으로 묶어 보세요.</p>';
    $$('#principle-list [data-principle-id]').forEach(b=>b.onclick=()=>openPrincipleEditor({id:b.dataset.principleId}));
  }
  $('#new-principle').onclick=()=>openPrincipleEditor();

  /* Editor sheet. */
  const sheet=document.createElement('section');
  sheet.className='sheet principle-sheet';sheet.id='principle-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-labelledby','principle-sheet-title');sheet.tabIndex=-1;
  sheet.innerHTML=`<div class="handle"></div><header><div><p class="eyebrow">MY PRINCIPLE</p><h2 id="principle-sheet-title">나의 원칙</h2></div><button class="close-sheet" type="button" aria-label="창 닫기">×</button></header>
  <form id="principle-form" novalidate>
  <label for="principle-statement">원칙 한 문장<input id="principle-statement" maxlength="120" autocomplete="off" placeholder="예: 바꿀 수 없는 제약부터 적고, 바꿀 수 있는 곳에서 작게 시험한다."></label>
  <label for="principle-reason">왜 그렇게 생각하나요?<textarea id="principle-reason" rows="3"></textarea></label>
  <fieldset class="principle-evidence"><legend>근거 기록 · 2개 이상 고르면 원칙이 돼요</legend><input id="principle-search" type="search" placeholder="제목이나 내 생각으로 찾기" aria-label="근거 기록 찾기"><p id="principle-hint" role="status" aria-live="polite"></p><div id="principle-records"></div></fieldset>
  <label for="principle-experience">적용해 본 경험 · 선택<textarea id="principle-experience" rows="2"></textarea></label>
  <div id="principle-history"></div>
  <p id="principle-status" role="status" aria-live="polite"></p>
  <button type="submit" class="primary" id="principle-save">원칙 저장 <span>→</span></button>
  <button type="button" id="principle-delete" hidden>이 원칙 지우기</button>
  </form>`;
  document.body.append(sheet);
  sheet.querySelector('.close-sheet').onclick=closeSheets;
  let editing={id:'',selected:new Set()};

  function candidates(){
    const q=$('#principle-search').value.trim().toLowerCase();
    return state.records.filter(r=>editing.selected.has(r.id)||r.thought?.trim()).filter(r=>!q||`${r.title} ${r.thought}`.toLowerCase().includes(q));
  }
  function renderEvidence(){
    const missing=[...editing.selected].filter(id=>!state.records.some(r=>r.id===id));
    $('#principle-records').innerHTML=candidates().map(r=>`<label class="principle-record"><input type="checkbox" value="${esc(r.id)}" ${editing.selected.has(r.id)?'checked':''}><span><strong>${esc(r.title)}${DataTools.isExample(r)?' <em>예시</em>':''}</strong><small>${esc((r.thought||'아직 내 생각이 없어요').slice(0,80))}</small></span></label>`).join('')+missing.map(()=>'<p class="principle-missing">삭제된 근거 기록 1개 · 저장하면 목록에서 빠져요</p>').join('')||'<p class="principle-empty">생각을 남긴 기록이 아직 없어요.</p>';
    $$('#principle-records input').forEach(input=>input.onchange=()=>{input.checked?editing.selected.add(input.value):editing.selected.delete(input.value);renderHint();});
    renderHint();
  }
  // A hint from the person's own words; nothing is written into the principle for them.
  function renderHint(){
    const chosen=state.records.filter(r=>editing.selected.has(r.id)),words=R.sharedThoughtWords(chosen,DataTools.words);
    const count=chosen.length;
    $('#principle-hint').textContent=`${count}개 선택${count<R.MIN_EVIDENCE?` · ${R.MIN_EVIDENCE-count}개 더 고르면 원칙이 돼요`:''}${words.length?` · 고른 기록의 생각에 반복된 단어: ${words.join(', ')}`:''}`;
  }
  $('#principle-search').oninput=renderEvidence;

  function openPrincipleEditor({id='',evidenceIds=[]}={}){
    const p=state.principles.find(x=>x.id===id);
    editing={id:p?.id||'',selected:new Set(p?p.evidenceIds:evidenceIds)};
    $('#principle-statement').value=p?.statement||'';$('#principle-reason').value=p?.reason||'';$('#principle-experience').value=p?.experience||'';
    $('#principle-search').value='';$('#principle-status').textContent='';
    $('#principle-delete').hidden=!p;
    $('#principle-history').innerHTML=p?.history.length?`<details><summary>이전 문장 ${p.history.length}개 · 생각이 바뀐 과정</summary><ol>${[...p.history].reverse().map(h=>`<li><time>${esc(dot(h.at))}</time> ${esc(h.statement)}</li>`).join('')}</ol></details>`:'';
    renderEvidence();
    closeSheets();setTimeout(()=>{openSheet('#principle-sheet');$('#principle-statement').focus();},80);
  }
  window.memoiveOpenPrinciple=openPrincipleEditor;

  $('#principle-form').onsubmit=event=>{
    event.preventDefault();
    const before=state.principles,isNew=!editing.id;
    // Deleted evidence records are dropped on save; everything else the person chose is kept.
    const evidenceIds=[...editing.selected].filter(id=>state.records.some(r=>r.id===id));
    try{state.principles=R.savePrinciple(state.principles,{statement:$('#principle-statement').value,reason:$('#principle-reason').value,experience:$('#principle-experience').value,evidenceIds},new Date().toISOString(),editing.id);}
    catch(error){$('#principle-status').textContent=error.message;return;}
    if(!safePersist()){state.principles=before;return;}
    const saved=isNew?state.principles.at(-1):state.principles.find(p=>p.id===editing.id),status=R.principleStatus(saved,state.records);
    track(isNew?'principle_created':'principle_updated',{value:status.draft?'draft':String(status.live.length)});
    closeSheets();renderPrinciples();refreshDetail();
    toast(status.draft?`초안으로 저장했어요. 근거 기록을 ${R.MIN_EVIDENCE-status.live.length}개 더 고르면 원칙이 돼요.`:'원칙을 저장했어요.');
  };
  $('#principle-delete').onclick=()=>{
    const p=state.principles.find(x=>x.id===editing.id);if(!p||!confirm('이 원칙을 지울까요? 근거 기록과 내 생각은 그대로 남아요.'))return;
    const before=state.principles;state.principles=state.principles.filter(x=>x.id!==p.id);
    if(!safePersist()){state.principles=before;return;}
    track('principle_deleted');closeSheets();renderPrinciples();refreshDetail();toast('원칙을 지웠어요. 기록은 그대로예요.');
  };

  /* Record detail: principles that use this record, and ones its words connect to. */
  const linked=document.createElement('section');
  linked.className='record-principles';linked.setAttribute('aria-label','이 기록과 이어지는 원칙');
  $('#detail-view .related').before(linked);
  function renderLinked(record){
    const using=state.principles.filter(p=>p.evidenceIds.includes(record.id));
    const matches=R.principleMatches(record,state.principles,DataTools.relatedRecords);
    linked.hidden=!using.length&&!matches.length;
    linked.innerHTML=`<p class="eyebrow">MY PRINCIPLES</p>${using.map(p=>`<button type="button" class="principle-card" data-principle-id="${esc(p.id)}"><strong>${esc(p.statement)}</strong><small>이 기록이 근거인 원칙</small></button>`).join('')}${matches.map(m=>`<div class="principle-match"><p>이 기록이 ‘${esc(m.principle.statement)}’ 원칙과 이어져요 <small>겹친 단어: ${esc(m.words.join(', '))}</small></p><button type="button" data-add-evidence="${esc(m.principle.id)}">근거로 추가</button></div>`).join('')}`;
    linked.querySelectorAll('[data-principle-id]').forEach(b=>b.onclick=()=>openPrincipleEditor({id:b.dataset.principleId}));
    linked.querySelectorAll('[data-add-evidence]').forEach(b=>b.onclick=()=>{
      const p=state.principles.find(x=>x.id===b.dataset.addEvidence),before=state.principles;if(!p)return;
      state.principles=R.savePrinciple(state.principles,{...p,evidenceIds:[...p.evidenceIds,record.id]},new Date().toISOString(),p.id);
      if(!safePersist()){state.principles=before;return;}
      track('principle_evidence_added',{recordId:record.id,type:record.type});
      renderLinked(record);renderPrinciples();toast('이 기록을 원칙의 근거로 더했어요.');
    });
  }
  function refreshDetail(){const r=state.records.find(x=>x.id===state.currentId);if(r&&$('#detail-view').classList.contains('active'))renderLinked(r);}
  const originalOpenRecord=openRecord;
  openRecord=function(id,options){originalOpenRecord(id,options);const record=state.records.find(r=>r.id===id);if(record&&state.currentId===id)safely(()=>renderLinked(record));};
  const originalRenderAll=renderAll;
  renderAll=function(){originalRenderAll();safely(renderPrinciples);};
  renderPrinciples();
})();
