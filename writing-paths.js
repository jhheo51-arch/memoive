/* Two starts, one editor. Reuse proposals never become the user's own thoughts. */
(()=>{
  const marker='[다시 쓸 방법]', form=$('#creator-form'), view=$('#output-viewpoint');
  const start=$('.studio-start');
  start.innerHTML='<h2>어디에서 시작할까요?</h2><button type="button" id="writing-from-record"><strong>기록에서 시작하기</strong><small>기록의 ‘다시 쓸 방법’을 글로 이어가요.</small><span aria-hidden="true">→</span></button><button type="button" id="new-output"><strong>내 생각으로 시작하기</strong><small>지금 남기고 싶은 말을 자유롭게 적어요.</small><span aria-hidden="true">→</span></button>';
  $('.studio-page .page-title h1').textContent='창작';
  $('.studio-page .page-title>p:last-child').textContent='한 문장이어도 괜찮아요. 내 글로 남겨보세요.';
  $('#case-help').hidden=true;$('.studio-progress').hidden=true;
  start.after($('#reuse-studio'));
  const picker=document.createElement('section');picker.id='writing-record-picker';picker.hidden=true;
  picker.innerHTML='<h2>어떤 기록을 이어 쓸까요?</h2><label>내 기록 찾기<input id="writing-record-query" type="search" placeholder="기록 제목으로 찾기"></label><div id="writing-record-list"></div>';
  start.after(picker);
  const method=document.createElement('section');method.id='writing-method';method.className='reuse-panel';method.hidden=true;form.prepend(method);
  // These old controls remain as storage adapters for existing work and backups.
  $('#writing-materials').hidden=true;
  $('#reuse-trace').hidden=true;$('.output-use').hidden=true;
  const autosave=$('#reuse-autosave');form.after(autosave);
  const thoughtLabel=view.closest('label');
  const reuse=()=>$('#output-purpose').value.startsWith(marker);
  window.memoiveReuseMode=reuse;
  const analysis=r=>r&&InsightTools.current(r,state.role);
  function showMethod(record){
    const ai=analysis(record);method.hidden=false;
    method.innerHTML='<h2>다시 쓸 방법</h2><small>AI가 제안한 활용 방법</small><h3>'+esc(record?.title||'원래 기록을 찾을 수 없어요.')+'</h3>'+(ai?.action?'<p>'+esc(ai.action.task)+'</p><p>남길 결과물: '+esc(ai.action.deliverable)+'</p>':'<p>기록의 분석을 먼저 완료하면 활용 방법을 가져올 수 있어요. 작성한 글은 그대로 남아 있어요.</p>')+(record?'<button type="button" class="secondary" id="writing-view-record">이 기록 자세히 보기 →</button>':'');
    const viewRecord=method.querySelector('#writing-view-record');if(viewRecord)viewRecord.onclick=()=>window.memoiveOpenRecordFromCreator?.(record.id);
  }
  function sync(){
    const isReuse=reuse();method.hidden=!isReuse;
    if(isReuse)showMethod(selectedCreatorRecords()[0]);
    thoughtLabel.childNodes[0].textContent=isReuse?'덧붙이고 싶은 내 생각 · 선택':'내 생각';
    view.placeholder=isReuse?'내 경험이나 생각을 더하고 싶다면 적어주세요. 비워도 괜찮아요.':'어떤 말을 남기고 싶으세요? 짧거나 정리되지 않아도 괜찮아요.';
    $('#creator-title').textContent=isReuse?'기록에서 시작하기':'내 생각으로 시작하기';
    $('#creator-step').textContent='글로 이어보고 · 고치고 · 남기기';
    $('#generate-output').textContent=isReuse?'이 방법으로 글 시작하기':'글로 이어보기';
    $('#writing-direct').hidden=isReuse;$('#writing-mic')?.setAttribute('hidden','');
    $('#ai-status').textContent=isReuse?'바로 고칠 수 있는 초안을 만들어요. 제안에 없는 경험이나 생각은 만들지 않아요.':'글로 이어보기는 바로 초안을 만들어요. AI 표현 제안은 이후에 선택할 수 있어요.';
  }
  const baseOpen=openCreator;
  openCreator=function(options={}){
    baseOpen(options);
    if(options.writingMode==='reuse'){
      $('#output-purpose').value=marker;$('#output-type').value='idea';
      view.dispatchEvent(new Event('input',{bubbles:true}));
    }
    sync();
  };
  function chooseRecord(id){openCreator({recordIds:[id],writingMode:'reuse'});}
  function renderRecords(){
    const q=$('#writing-record-query').value.trim().toLocaleLowerCase();
    const records=state.records.filter(r=>!DataTools.isExample(r)&&r.title.toLocaleLowerCase().includes(q));
    $('#writing-record-list').innerHTML=records.map(r=>{
      const ready=!!analysis(r)?.action;
      return '<button type="button" data-writing-record="'+esc(r.id)+'"><strong>'+esc(r.title)+'</strong><small>'+ (ready?esc(analysis(r).action.task):'분석을 먼저 완료해 주세요 · 기록 열기')+'</small></button>';
    }).join('')||'<p>'+(q?'찾는 기록이 없어요. 다른 제목으로 찾아보세요.':'저장한 기록이 없어요. 기록을 먼저 남기거나 내 생각으로 시작해 보세요.')+'</p>';
    picker.querySelectorAll('[data-writing-record]').forEach(b=>b.onclick=()=>{
      const r=state.records.find(x=>x.id===b.dataset.writingRecord);
      if(analysis(r)?.action)chooseRecord(r.id);else openRecord(r.id);
    });
  }
  $('#writing-from-record').onclick=()=>{picker.hidden=!picker.hidden;$('#writing-from-record').setAttribute('aria-expanded',String(!picker.hidden));if(!picker.hidden){renderRecords();$('#writing-record-query').focus();}};
  $('#writing-from-record').setAttribute('aria-expanded','false');$('#writing-from-record').setAttribute('aria-controls',picker.id);
  $('#writing-record-query').oninput=renderRecords;
  $('#new-output').onclick=()=>openCreator();
  const baseStudio=renderStudio;renderStudio=function(){baseStudio();if(!picker.hidden)renderRecords();};
  // Same selection directly from the record: no second trip through the picker.
  const baseResult=renderInsightResult;
  renderInsightResult=function(record){baseResult(record);const host=$('#record-analysis');if(!analysis(record)?.action||host.querySelector('[data-writing-method]'))return;
    const button=document.createElement('button');button.type='button';button.className='secondary solid';button.dataset.writingMethod=record.id;button.textContent='이 방법으로 글 시작하기';button.onclick=()=>chooseRecord(record.id);host.lastElementChild.append(button);
  };
  // The existing service accepts an editorial intention separately from source facts.
  // The actual thought field remains untouched, including in saved work.
  window.memoiveWritingPayload=payload=>{
    if(!reuse())return payload;
    const r=selectedCreatorRecords()[0],ai=analysis(r);
    if(!ai?.action){$('#ai-status').textContent='이 기록의 분석을 먼저 완료해 주세요. 지금 쓴 글은 그대로 보관돼요.';return null;}
    if(ai.action.task.length>600||ai.action.deliverable.length>200){$('#ai-status').textContent='활용 제안이 한 번에 보낼 수 있는 분량을 넘었어요. 기록에서 분석을 다시 받아주세요. 작성한 글은 그대로예요.';return null;}
    return {...payload,purpose:'',reuseProposal:{task:ai.action.task,deliverable:ai.action.deliverable},records:[{title:r.title,source:r.source,url:r.url,summary:ai.summary,points:ai.facts?.map(f=>f.claim)||[],thought:r.thought||'',uncertainty:(ai.unknowns||[]).join('\n')}]};
  };
})();
