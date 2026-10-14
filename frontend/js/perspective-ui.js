/* Custom perspectives, per-perspective templates, and thoughts shown side by side by perspective. */
(()=>{
  const P=PerspectiveTools;
  const current=()=>P.find(state.perspectiveId,state.perspectives)||P.BUILTIN[0];
  const nameOf=entry=>{if(!entry.perspectiveId)return'관점 없이 남긴 생각';const p=P.find(entry.perspectiveId,state.perspectives);return p?p.label:`${entry.perspectiveName||'이전'} 관점 · 삭제된 관점`};
  const normalize=record=>Object.assign(record,DataTools.normalizeThoughts(record));
  const safePersist=()=>{try{persist();return true}catch{return false}};

  function choosePerspective(id){
    const p=P.find(id,state.perspectives);if(!p)return;
    const detailWasOpen=$('#detail-view').classList.contains('active');
    state.perspectiveId=p.id;state.role=p.base;
    if(!safePersist())return;
    track('perspective_selected',{value:p.builtin?p.id:'custom'});
    renderPerspectiveSettings();
    toast(p.builtin?`${p.label}으로 바꿨어요. 생각 템플릿과 질문이 이 관점을 따라요.`:`${p.label}으로 바꿨어요. AI는 ${p.base} 관점을 바탕으로 이 관점에 맞춰 질문해요.`);
    if(detailWasOpen&&state.currentId)openRecord(state.currentId,{trackOpen:false});
  }
  chooseRole=role=>choosePerspective(P.idForRole(role));

  /* Settings: pick, create, edit and delete perspectives. */
  const grid=$('.role-grid');
  const manager=document.createElement('section');
  manager.className='perspective-manager';manager.setAttribute('aria-labelledby','perspective-manager-title');
  manager.innerHTML=`<h3 id="perspective-manager-title">내 관점</h3><p class="perspective-note">직무 밖의 관심사도 관점이 될 수 있어요. 템플릿은 생각을 적을 때 보이는 소제목이며, 비워 두어도 저장돼요.</p><ul id="custom-perspectives"></ul>
  <details id="perspective-editor"><summary>+ 내 관점 만들기</summary><form id="perspective-form" novalidate>
  <label for="perspective-name">관점 이름<input id="perspective-name" maxlength="20" autocomplete="off" placeholder="예: UX 리서처, 창업 준비, 과학 공부"></label>
  <label for="perspective-prompts">생각 템플릿 · 선택<textarea id="perspective-prompts" rows="4" placeholder="한 줄에 하나씩, 최대 4개&#10;예: 무엇이 새로웠나&#10;내 일에 적용한다면"></textarea></label>
  <label for="perspective-base">AI 질문은 어떤 기본 관점을 따를까요?<select id="perspective-base">${P.BUILTIN.map(p=>`<option value="${esc(p.base)}">${esc(p.label)}</option>`).join('')}</select></label>
  <small>AI 정리와 질문에는 이 기본 관점과 함께 내 관점 이름·템플릿 소제목이 전송돼요. 보내기 전에 전송 내용을 보여드려요.</small>
  <p id="perspective-form-status" role="status" aria-live="polite"></p>
  <div class="perspective-form-actions"><button type="submit" class="primary" id="perspective-save">관점 저장</button><button type="button" id="perspective-cancel">취소</button></div></form></details>`;
  grid.after(manager);
  let editingId='';

  function renderPerspectiveSettings(){
    const selected=current();
    grid.setAttribute('aria-label','기록 관점 선택');
    grid.innerHTML=P.all(state.perspectives).map(p=>`<button type="button" data-perspective-id="${esc(p.id)}" aria-pressed="${p.id===selected.id}" class="${p.id===selected.id?'active':''}"><span>${esc(p.label)}</span><small>${esc(p.hint)}</small></button>`).join('');
    grid.querySelectorAll('button').forEach(button=>button.onclick=()=>choosePerspective(button.dataset.perspectiveId));
    const custom=P.cleanCustom(state.perspectives);
    $('#custom-perspectives').innerHTML=custom.length?custom.map(p=>`<li><span><strong>${esc(p.name)}</strong><small>${p.prompts.length?esc(p.prompts.join(' / ')):'템플릿 없이 자유롭게'} · AI는 ${esc(p.base)} 관점</small></span><button type="button" data-edit-perspective="${esc(p.id)}">고치기</button><button type="button" data-delete-perspective="${esc(p.id)}">삭제</button></li>`).join(''):'<li class="perspective-empty">아직 만든 관점이 없어요.</li>';
    manager.querySelectorAll('[data-edit-perspective]').forEach(button=>button.onclick=()=>startEdit(button.dataset.editPerspective));
    manager.querySelectorAll('[data-delete-perspective]').forEach(button=>button.onclick=()=>deletePerspective(button.dataset.deletePerspective));
    $('#perspective-editor summary').textContent=custom.length>=P.MAX_CUSTOM&&!editingId?`내 관점은 ${P.MAX_CUSTOM}개까지 만들 수 있어요`:editingId?'관점 고치기':'+ 내 관점 만들기';
    $('#profile-initial').textContent=selected.name[0];
  }
  function resetForm(){editingId='';$('#perspective-form').reset();$('#perspective-form-status').textContent='';$('#perspective-save').textContent='관점 저장';}
  function startEdit(id){
    const p=P.find(id,state.perspectives);if(!p)return;
    editingId=id;$('#perspective-name').value=p.name;$('#perspective-prompts').value=p.prompts.join('\n');$('#perspective-base').value=p.base;
    $('#perspective-save').textContent='변경 저장';$('#perspective-editor').open=true;renderPerspectiveSettings();$('#perspective-name').focus();
  }
  function deletePerspective(id){
    const p=P.find(id,state.perspectives);if(!p||!confirm(`‘${p.name}’ 관점을 지울까요? 이 관점으로 쓴 생각은 지워지지 않고 ‘삭제된 관점’으로 남아요.`))return;
    const before=state.perspectives;state.perspectives=P.remove(id,state.perspectives);
    if(state.perspectiveId===id){state.perspectiveId=P.BUILTIN[0].id;state.role=P.BUILTIN[0].base;}
    if(!safePersist()){state.perspectives=before;return;}
    track('perspective_deleted',{value:'custom'});
    if(editingId===id)resetForm();
    renderPerspectiveSettings();toast('관점을 지웠어요. 이 관점으로 쓴 생각은 그대로예요.');
  }
  $('#perspective-form').onsubmit=event=>{
    event.preventDefault();
    const fields={name:$('#perspective-name').value,prompts:$('#perspective-prompts').value,base:$('#perspective-base').value},before=state.perspectives;
    try{state.perspectives=editingId?P.update(editingId,fields,state.perspectives):P.create(fields,state.perspectives);}
    catch(error){$('#perspective-form-status').textContent=error.message;return;}
    const created=!editingId&&state.perspectives.at(-1);
    if(created){state.perspectiveId=created.id;state.role=created.base;}
    if(!safePersist()){state.perspectives=before;return;}
    track(editingId?'perspective_updated':'perspective_created',{value:'custom'});
    resetForm();$('#perspective-editor').open=false;renderPerspectiveSettings();
    toast(created?`‘${created.name}’ 관점을 만들고 선택했어요.`:'관점을 고쳤어요.');
  };
  $('#perspective-cancel').onclick=()=>{resetForm();$('#perspective-editor').open=false;renderPerspectiveSettings();};

  /* Thought sheet: one free line first, then the perspective's template as optional fields. */
  const sheet=$('#thought-sheet'),freeInput=$('#thought-input');
  const chips=document.createElement('div');
  chips.className='thought-perspectives';chips.setAttribute('role','group');chips.setAttribute('aria-label','어떤 관점의 생각인가요?');
  $('#thought-question').before(chips);
  const template=document.createElement('fieldset');
  template.className='thought-template';
  freeInput.after(template);
  const questions=document.createElement('fieldset');
  questions.className='thought-questions';
  template.after(questions);
  freeInput.placeholder='한 문장이면 충분해요.';
  freeInput.setAttribute('aria-label','내 생각 한 줄');
  let session=null;
  const listeners=[];

  // Entry for this perspective, or an unlabeled thought to adopt when no perspective has one yet.
  function targetEntry(record,perspectiveId){
    // Follow-ups added on later days are never the entry being edited here.
    const entries=record.thoughts.filter(e=>e.kind!=='followup');
    return entries.find(e=>e.perspectiveId===perspectiveId)||(entries.some(e=>e.perspectiveId)?null:entries.find(e=>!e.perspectiveId))||null;
  }
  // A thought whose perspective was deleted keeps that perspective while it is edited.
  const sheetPerspective=()=>P.find(session.perspectiveId,state.perspectives)||(session.orphan?.id===session.perspectiveId?session.orphan:current());
  const sheetRecord=()=>state.records.find(r=>r.id===session.recordId);
  const sheetEntry=()=>session.entryId?sheetRecord()?.thoughts.find(e=>e.id===session.entryId):null;
  const field=(prompt,i,value,source='')=>`<label for="thought-section-${i}"><span>${source?`<span class="question-mark">Q.</span> `:''}${esc(prompt)}</span><textarea id="thought-section-${i}" rows="2" data-prompt="${esc(prompt)}"${source?` data-source="${esc(source)}"`:''}>${esc(value??'')}</textarea></label>`;
  function renderSheet(){
    const record=sheetRecord(),p=sheetPerspective(),key=session.key();
    chips.innerHTML=[...P.all(state.perspectives),...(session.orphan?[session.orphan]:[])].map(item=>`<button type="button" data-thought-perspective="${esc(item.id)}" aria-pressed="${item.id===p.id}" class="${item.id===p.id?'active':''}">${esc(item.name)}</button>`).join('');
    chips.querySelectorAll('button').forEach(button=>button.onclick=()=>{remember();session.perspectiveId=button.dataset.thoughtPerspective;session.entryId='';loadEntry(record);renderSheet();});
    const prompts=[...new Set([...p.prompts,...(sheetEntry()?.sections||[]).filter(s=>s.prompt&&!s.source).map(s=>s.prompt)])];
    const values=session.drafts[key]||{},asked=session.asked[key]||[];
    freeInput.value=values['']??'';
    template.hidden=!prompts.length;
    template.innerHTML=prompts.length?`<legend>${esc(p.label)} 템플릿으로 더 적기 · 선택</legend>${prompts.map((prompt,i)=>field(prompt,i,values[prompt])).join('')}`:'';
    questions.hidden=!asked.length;
    questions.innerHTML=asked.length?`<legend>받은 질문 · 답한 질문만 저장돼요</legend>${asked.map((q,i)=>field(q.prompt,prompts.length+i,values[q.prompt],q.source)).join('')}`:'';
    $('#save-thought').firstChild.textContent=`${p.name} 관점으로 저장 `;
    listeners.forEach(listener=>listener());
  }
  function loadEntry(record){
    const entry=session.entryId?record.thoughts.find(e=>e.id===session.entryId):targetEntry(record,session.perspectiveId);
    session.entryId=entry?.id||'';
    const key=session.key();
    if(session.drafts[key])return;
    session.drafts[key]=Object.fromEntries((entry?.sections||[]).map(s=>[s.prompt,s.text]));
    session.asked[key]=(entry?.sections||[]).filter(s=>s.source).map(s=>({prompt:s.prompt,source:s.source}));
  }
  function remember(){
    const values={'':freeInput.value};
    sheet.querySelectorAll('textarea[data-prompt]').forEach(area=>values[area.dataset.prompt]=area.value);
    session.drafts[session.key()]=values;
  }
  openThought=function(id,{perspectiveId='',entryId=''}={}){
    const record=state.records.find(r=>r.id===id);if(!record)return;
    normalize(record);state.currentId=id;
    const entry=entryId&&record.thoughts.find(e=>e.id===entryId);
    const orphan=entry?.perspectiveId&&!P.find(entry.perspectiveId,state.perspectives)?{id:entry.perspectiveId,name:entry.perspectiveName||'이전',label:`${entry.perspectiveName||'이전'} 관점 (삭제됨)`,prompts:[],builtin:false}:null;
    session={recordId:id,perspectiveId:entry?.perspectiveId||perspectiveId||state.perspectiveId,entryId:entry?.id||'',orphan,drafts:{},asked:{},key(){return`${this.perspectiveId}|${this.entryId}`}};
    if(!P.find(session.perspectiveId,state.perspectives)&&!orphan)session.perspectiveId=current().id;
    loadEntry(record);
    $('#thought-question').textContent=recordQuestion(record);
    renderSheet();openSheet('#thought-sheet');
  };
  saveThought=function(){
    const record=sheetRecord();if(!record)return;
    remember();
    const p=sheetPerspective(),key=session.key(),values=session.drafts[key],asked=session.asked[key]||[];
    const sourceOf=Object.fromEntries(asked.map(q=>[q.prompt,q.source]));
    const sections=[{prompt:'',text:values['']||''},...Object.entries(values).filter(([prompt])=>prompt).map(([prompt,text])=>({prompt,text,source:sourceOf[prompt]}))];
    const hadEntry=!!session.entryId,hasText=sections.some(s=>s.text.trim());
    if(!hasText&&!hadEntry)return toast('한 문장만 남겨주세요.');
    const before={thoughts:record.thoughts,thought:record.thought};
    Object.assign(record,DataTools.upsertThought(record,{entryId:session.entryId,perspectiveId:p.id,perspectiveName:p.name,sections}));
    const answered=sections.filter(s=>s.source&&s.text.trim()).length;
    try{
      if(answered)track('question_answered',{recordId:record.id,type:record.type,value:String(answered)});
      track('thought_saved',{recordId:record.id,type:record.type,value:p.builtin?p.id:'custom'});
    }catch{Object.assign(record,before);return;}
    closeSheets();openRecord(record.id,{trackOpen:false});
    toast(hasText?'내 생각을 이 브라우저에 저장했어요.':'이 관점의 생각을 지웠어요.');
  };
  // Hook for the question coach; it adds questions but never writes answers.
  window.memoiveThoughtSheet={
    onRender:listener=>listeners.push(listener),
    current(){
      if(!session||!$('#thought-sheet').classList.contains('active'))return null;
      remember();
      const values=session.drafts[session.key()];
      return {scope:`${session.recordId}|${session.perspectiveId}`,record:sheetRecord(),perspective:sheetPerspective(),free:values['']||'',questions:(session.asked[session.key()]||[]).map(q=>({...q,answer:values[q.prompt]||''}))};
    },
    addQuestion(prompt,source){
      if(!session)return;
      remember();
      const key=session.key(),asked=session.asked[key]||(session.asked[key]=[]);
      if(!asked.some(q=>q.prompt===prompt))asked.push({prompt,source});
      renderSheet();
      questions.querySelector(`textarea[data-prompt="${CSS.escape(prompt)}"]`)?.focus();
    }
  };
  $('#save-thought').onclick=()=>saveThought();

  /* Record detail: one plain line stays plain; templates or several perspectives become cards. */
  const section=$('.my-thought'),plain=$('#detail-thought');
  const caption=document.createElement('span');caption.id='detail-thought-perspective';
  section.querySelector('header .eyebrow').after(caption);
  const cards=document.createElement('div');cards.id='detail-thought-entries';
  plain.after(cards);
  function renderThoughts(record){
    normalize(record);
    const entries=record.thoughts.filter(e=>e.kind!=='followup'),simple=entries.length===1&&entries[0].sections.every(s=>!s.prompt);
    plain.hidden=entries.length>0?!simple:record.thoughts.length>0;
    if(simple)plain.textContent=entries[0].sections.map(s=>s.text).filter(Boolean).join('\n');
    caption.textContent=simple&&entries[0].perspectiveId?nameOf(entries[0]):'';
    const perspectives=new Set(entries.map(e=>e.perspectiveId||'free'));
    cards.className=perspectives.size>1?'thought-compare':'';
    const unused=P.all(state.perspectives).find(p=>!entries.some(e=>e.perspectiveId===p.id));
    const addButton=entries.length&&unused?`<button type="button" class="thought-add" data-add-perspective="${esc(unused.id)}">+ 다른 관점으로 생각 남기기</button>`:'';
    cards.innerHTML=(simple||!entries.length?'':`${perspectives.size>1?'<p class="eyebrow">관점별로 나란히 보기</p>':''}${entries.map(entry=>`<article class="thought-entry"><header><b>${esc(nameOf(entry))}</b><button type="button" data-edit-entry="${esc(entry.id)}">고치기</button></header>${entry.sections.filter(s=>s.text).map(s=>s.prompt?`<dl><dt>${s.source?'<span class="question-mark">Q.</span> ':''}${esc(s.prompt)}</dt><dd>${esc(s.text)}</dd></dl>`:`<p>${esc(s.text)}</p>`).join('')}</article>`).join('')}`)+addButton;
    cards.querySelectorAll('[data-edit-entry]').forEach(button=>button.onclick=()=>openThought(record.id,{entryId:button.dataset.editEntry}));
    cards.querySelector('[data-add-perspective]')?.addEventListener('click',event=>openThought(record.id,{perspectiveId:event.currentTarget.dataset.addPerspective}));
  }
  const originalOpenRecord=openRecord;
  openRecord=function(id,options){originalOpenRecord(id,options);const record=state.records.find(r=>r.id===id);if(record&&state.currentId===id)renderThoughts(record);};

  const originalRenderAll=renderAll;
  renderAll=function(){state.records.forEach(normalize);originalRenderAll();renderPerspectiveSettings();};
  renderAll();
})();
