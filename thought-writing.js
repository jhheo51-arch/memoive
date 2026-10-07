/* Thought-first writing. Existing edits stay in place; later AI drafts are separate proposals. */
(()=>{
  const form=$('#creator-form'),draft=$('#creator-draft'),view=$('#output-viewpoint');
  const group=(id,title)=>{const el=document.createElement('details');el.id=id;el.className='writing-options';const s=document.createElement('summary');s.textContent=title;el.append(s);return el;};
  const materials=group('writing-materials','참고할 기록과 이전 생각 가져오기 · 선택');
  const settings=group('writing-settings','채널에 맞춰 바꾸기 · 선택');
  const work=group('writing-work','작업 이름과 이전 작업 설정 · 선택');
  $('#reuse-work').before(work);work.append($('#reuse-work'));form.append(materials);
  [...form.children].filter(el=>el!==materials&&el!==view.closest('label')&&el.id!=='generate-output'&&el.id!=='ai-status'&&!el.contains($('#output-type'))&&!el.contains($('#output-tone'))&&!el.contains($('#output-purpose'))).forEach(el=>materials.append(el));
  draft.append(settings);
  [$('#output-type'),$('#output-tone'),$('#output-purpose')].forEach(el=>settings.append(el.closest('label')));
  const option=document.querySelector('#output-type option[value="idea"]');option.textContent='내 글 · 채널 지정 없음';
  const thoughtLabel=view.closest('label');thoughtLabel.childNodes[0].textContent='내 생각';view.placeholder='어떤 말을 남기고 싶으세요? 짧거나 정리되지 않아도 괜찮아요.';view.rows=5;
  form.prepend(thoughtLabel);thoughtLabel.after(materials);
  materials.append(work);
  $('#generate-output').textContent='글로 이어보기';
  const direct=document.createElement('button');direct.type='button';direct.id='writing-direct';direct.className='secondary solid';direct.textContent='내 생각 그대로 글로 남기기';$('#generate-output').after(direct);
  $('#ai-status').textContent='글로 이어보기는 이 기기에서 바로 초안을 만들어요. AI 표현 제안은 이후에 선택할 수 있어요.';
  $('#output-title').closest('label').childNodes[0].textContent='제목 · 비워도 괜찮아요';
  $('#output-body').closest('label').childNodes[0].textContent='내 글';$('#output-body').rows=14;
  const aiSuggest=document.createElement('button');aiSuggest.type='button';aiSuggest.id='writing-ai-suggest';aiSuggest.className='secondary solid';aiSuggest.textContent='AI로 표현 제안 받기 · 선택';$('#output-body').closest('label').after(aiSuggest);
  draft.querySelector('.creator-step').textContent='내가 하고 싶었던 말이 담겼나요?';
  $('#save-output').textContent='내 글로 남기기';
  const quality=$('.quality-check');quality.hidden=true;
  // Keep legacy nodes for existing preview callers, without any scoring logic.
  renderOutputQuality=()=>0;
  $('#save-output').after(settings);
  const channel=document.createElement('button');channel.type='button';channel.className='secondary solid';channel.textContent='선택한 채널로 새 제안 보기';settings.append(channel);
  const more=group('writing-more','출처 확인과 공유 · 선택');settings.after(more);
  ['#output-sources','#reuse-trace','.share-card-section','.output-use'].forEach(s=>{const el=$(s);if(el)more.append(el);});
  $('.share-note').textContent='원할 때 이미지로 저장하거나 글을 복사할 수 있어요.';
  const proposal=document.createElement('section');proposal.id='writing-proposal';proposal.hidden=true;proposal.className='reuse-panel';
  proposal.innerHTML='<h2>새로운 표현 제안</h2><p>작성 중인 글은 그대로 두었어요. 마음에 들면 별도 글로 남기세요.</p><label>제안 제목<input id="writing-proposal-title"></label><label>제안 글<textarea id="writing-proposal-body" rows="14"></textarea></label><button type="button" class="primary" id="writing-save-proposal">제안을 별도 글로 남기기</button><button type="button" class="secondary" id="writing-dismiss">제안 닫기</button>';
  settings.after(proposal);
  let pending=false,proposalContext=null,epoch=0;
  const baseOpen=openCreator;
  openCreator=function(options={}){baseOpen(options);epoch++;proposal.hidden=true;proposalContext=null;materials.open=false;settings.open=false;work.open=false;more.open=false;
    $('#creator-title').textContent='내 생각을 글로';$('#creator-step').textContent='글로 이어보고 · 고치고 · 남기기';
    $('#ai-status').textContent='글로 이어보기는 바로 초안을 만들어요. AI 표현 제안은 이후에 선택할 수 있어요.';
    // Only populate a new, empty work from the user's existing thoughts.
    if(!view.value.trim()&&!$('#output-body').value.trim()){
      view.value=selectedCreatorRecords().map(r=>r.thought?.trim()).filter(Boolean).join('\n\n');
      $('#output-type').value='idea';view.dispatchEvent(new Event('input',{bubbles:true}));
    }
    work.hidden=false;refreshOutputPreview();
  };
  function quickDraftContent(){
    const thought=view.value.trim(),records=selectedCreatorRecords();
    if(window.memoiveReuseMode?.()){
      const record=records[0],action=record&&InsightTools.current(record,state.role)?.action;
      return action?{title:action.deliverable?.trim()||record.title,body:`${action.task.trim()}${thought?'\n\n내 생각\n'+thought:''}`}:null;
    }
    if(!thought)return null;
    const sentences=thought.replace(/\s+/g,' ').split(/(?<=[.!?。！？])\s+/).filter(Boolean);
    return {title:(sentences[0]||thought).slice(0,42).trim(),body:sentences.length>1?sentences.join('\n\n'):thought};
  }
  const payload=(channelMode)=>{
    const title=$('#output-title').value,body=$('#output-body').value,draft=body.trim()?{title,body}:null;
    const quick=quickDraftContent(),copied=draft&&((quick&&draft.title===quick.title&&draft.body===quick.body)
      ||(draft.body===view.value.trim()&&draft.title===view.value.trim().split('\n')[0].slice(0,40)));
    return {type:channelMode?$('#output-type').value:'idea',tone:$('#output-tone').value,purpose:$('#output-purpose').value.trim(),viewpoint:view.value.trim(),records:selectedCreatorRecords().map(r=>({title:r.title,source:r.source,url:r.url,summary:r.summary,points:r.points,thought:r.thought,uncertainty:r.uncertainty,...($('#creator-include-source').checked?{sourceExcerpt:(r.sourceBody||'').slice(0,6000)}:{})})),draft:copied?null:draft};
  };
  function quickDraft(){
    const thought=view.value.trim(),isReuse=window.memoiveReuseMode?.();
    if(!thought&&!isReuse){view.focus();$('#ai-status').textContent='어떤 말을 남기고 싶으세요? 한 단어부터 시작해도 괜찮아요.';return;}
    if($('#output-body').value.trim()){draft.classList.remove('hidden');$('#ai-status').textContent='작성 중인 글을 그대로 두었어요. 아래에서 수정하거나 저장해 주세요.';$('#output-body').focus();return;}
    const records=selectedCreatorRecords(),quick=quickDraftContent();
    if(!quick){$('#ai-status').textContent='이 기록의 분석을 먼저 완료해 주세요.';return;}
    applyOutputDraft(quick,records,$('#output-type').value);
    $('#creator-step').textContent='글로 이어보고 · 고치고 · 남기기';
    $('#ai-status').textContent='바로 고치고 저장할 수 있는 초안을 만들었어요. AI 표현 제안은 아래에서 선택할 수 있어요.';
  }
  async function suggestWithAi(channelMode=false){
    if(pending)return; if(!view.value.trim()&&!window.memoiveReuseMode?.()){view.focus();$('#ai-status').textContent='어떤 말을 남기고 싶으세요? 한 단어부터 시작해도 괜찮아요.';return;}
    const records=selectedCreatorRecords(),request=window.memoiveWritingPayload?window.memoiveWritingPayload(payload(channelMode)):payload(channelMode),startEpoch=epoch;if(!request)return;
    pending=true;aiSuggest.disabled=true;channel.disabled=true;aiSuggest.setAttribute('aria-busy','true');$('#ai-status').textContent='AI가 다른 표현을 제안하고 있어요. 작성 중인 글은 계속 수정하거나 저장할 수 있어요.';
    try{const result=await requestAiDraft(request);if(epoch!==startEpoch)return;
      if($('#output-body').value.trim()){
        $('#writing-proposal-title').value=result.title;$('#writing-proposal-body').value=result.body;proposalContext={records:records.map(r=>r.id),type:request.type,viewpoint:view.value.trim(),purpose:$('#output-purpose').value.trim(),tone:request.tone};proposal.hidden=false;proposal.scrollIntoView({block:'nearest'});
        $('#ai-status').textContent='새 제안을 아래에 두었어요. 직접 고친 글은 그대로예요.';
      }else{applyOutputDraft(result,records,request.type);$('#creator-step').textContent='글로 이어보고 · 고치고 · 남기기';$('#ai-status').textContent='내가 하려던 말과 맞으면 그대로 남겨도 괜찮아요.';}
    }catch(e){if(epoch===startEpoch)$('#ai-status').textContent=e.code==='AI_CANCELLED'?'AI 요청을 취소했어요. 작성 중인 글은 그대로예요.':'AI 제안을 받지 못했어요. 작성 중인 글은 그대로 수정하거나 저장할 수 있어요.';}
    finally{pending=false;aiSuggest.disabled=false;channel.disabled=false;aiSuggest.removeAttribute('aria-busy');}
  }
  form.onsubmit=e=>{e.preventDefault();quickDraft();};aiSuggest.onclick=()=>suggestWithAi();channel.onclick=()=>suggestWithAi(true);
  direct.onclick=()=>{if(!view.value.trim()){view.focus();return;}if($('#output-body').value.trim()){draft.classList.remove('hidden');$('#ai-status').textContent='작성 중인 글이 있어 그대로 두었어요. 아래에서 수정하거나 저장해 주세요.';return;}applyOutputDraft({title:view.value.trim().split('\n')[0].slice(0,40),body:view.value.trim()},selectedCreatorRecords(),'idea');$('#creator-step').textContent='글로 이어보고 · 고치고 · 남기기';$('#ai-status').textContent='입력한 생각을 그대로 옮겼어요. 내 글로 남기기를 누르면 저장돼요.';};
  const baseSave=saveOutput;saveOutput=function(){if(!$('#output-body').value.trim())return toast('남길 말을 먼저 적어주세요.');if(!$('#output-title').value.trim())$('#output-title').value=$('#output-body').value.trim().split('\n')[0].slice(0,40);baseSave();};$('#save-output').onclick=()=>saveOutput();
  $('#writing-dismiss').onclick=()=>proposal.hidden=true;
  $('#writing-save-proposal').onclick=()=>{
    const body=$('#writing-proposal-body').value.trim();if(!body||!proposalContext)return;
    const now=new Date().toISOString(),entry={id:crypto.randomUUID(),title:$('#writing-proposal-title').value.trim()||body.slice(0,40),body,...proposalContext,sourceRecordIds:proposalContext.records,sourceLinkedAt:Object.fromEntries(proposalContext.records.map(id=>[id,now])),createdAt:now,updatedAt:now,draftOrigin:'ai',shareFormat:proposalContext.type==='social_story'?'story':'post',usedAt:'',useNote:''};delete entry.records;
    const previous=state.outputs;state.outputs=[entry,...previous];try{persist();}catch(e){state.outputs=previous;return toast('저장하지 못했어요. 제안은 이 화면에 남겨두었어요.');}proposal.hidden=true;toast('별도 글로 남겼어요. 작성 중인 글도 그대로예요.');
  };
  // Voice uses the browser's supported dictation service, only after an explicit click.
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(Recognition){const mic=document.createElement('button');mic.type='button';mic.id='writing-mic';mic.className='secondary';mic.textContent='말로 생각 남기기';thoughtLabel.after(mic);let rec=null;
    mic.onclick=async()=>{if(rec){rec.stop();return;}if(!await window.memoiveConfirm('브라우저의 음성 인식 서비스를 사용합니다. 음성이 브라우저 제공업체로 전송될 수 있어요. 시작할까요?'))return;const targetEpoch=epoch;rec=new Recognition();rec.lang='ko-KR';rec.interimResults=false;mic.textContent='듣기 중 · 멈추기';rec.onresult=e=>{if(epoch!==targetEpoch)return;const text=Array.from(e.results).map(r=>r[0].transcript).join(' ');view.value=[view.value.trim(),text].filter(Boolean).join('\n');view.dispatchEvent(new Event('input',{bubbles:true}));};rec.onerror=()=>{$('#ai-status').textContent='음성을 인식하지 못했어요. 직접 입력해도 괜찮아요.';};rec.onend=()=>{rec=null;mic.textContent='말로 생각 남기기';};try{rec.start();}catch{rec=null;mic.textContent='말로 생각 남기기';}};
  }
})();
