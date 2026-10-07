/* View contract: never substitute extraction for AI analysis. */
(()=>{
  const host=document.createElement('section');host.id='record-analysis';
  $('.one-line').after(host);
  // Routine settings belong in the profile, not between analysis and thoughts.
  const options=$('.insight-options'),flow=$('#insight-flow');
  options.querySelector('summary').textContent='본문·AI 연결 복구';
  const settings=document.createElement('section');settings.className='settings-section';
  settings.innerHTML='<h3>AI 자동 정리</h3>';
  const toggle=$('#auto-summary-enabled').closest('label'),help=toggle.nextElementSibling;
  settings.append(toggle,help,$('.ai-privacy'));$('.profile-content').append(settings);
  for(const title of flow.querySelectorAll('h4')){
    if(title.textContent.startsWith('2.')){title.hidden=true;title.nextElementSibling.hidden=true;}
    else title.textContent=title.textContent.startsWith('1.')?'본문 준비':'본문 전송 확인';
  }
  $('#insight-context-fields').hidden=true;
  // Hidden personal fields cannot silently contribute to a recovery request.
  selectedInsightContext=()=>({});
  const renderBeforeCleanup=renderInsight;
  renderInsight=function(record){
    renderBeforeCleanup(record);
    options.hidden=!!InsightTools.current(record,state.role)||insightJobs.has(record.id)||record.fetchStatus==='reading';
    if(options.hidden)options.open=false;
    if(!$('#auto-summary-enabled').checked&&!InsightTools.current(record,state.role))$('#auto-summary-status').textContent='자동 정리가 꺼져 있어요. 개인화 설정에서 켤 수 있어요.';
    $('#insight-consent-row').lastChild.textContent='위 본문을 Gemini로 보내는 데 동의해요.';
  };
  const part=(title,content)=>`<section class="analysis-part"><h3>${title}</h3>${content}</section>`;
  const p=text=>`<p>${esc(text)}</p>`;
  function locationOf(record,quote){
    const body=record.sourceBody||'',at=body.indexOf(quote);
    if(at<0)return '현재 보관 본문에서 위치 확인되지 않음';
    const line=body.slice(0,at).split('\n').length;
    return `보관 본문 ${line}행 · ${at+1}~${at+quote.length}번째 문자`;
  }
  renderInsightResult=function(record){
    const ai=InsightTools.current(record,state.role);
    const key=JSON.stringify([record.id,state.role,ai,record.sourceDate,record.sourceBody?.length]);
    if(host.dataset.resultKey===key)return;
    host.dataset.resultKey=key;
    const source=record.source||record.sourceName||record.siteName||'';
    const info=p(record.title)+p(source||'출처 미확인')+p('저장일: '+(record.savedAt||'미확인'))+p(record.sourceBody?`분석 대상: ${record.type==='video'?(record.bodyMethod==='youtube-transcript'?'자동 자막 스크립트':'직접 입력한 스크립트'):'저장한 본문'} ${record.sourceBody.length.toLocaleString()}자${ai?.sourceChars&&ai.sourceChars<record.sourceBody.length?' 중 '+ai.sourceChars.toLocaleString()+'자만 분석':''}`:'본문을 확보해야 내용을 분석할 수 있어요.');
    host.innerHTML=part('자료 정보',info+(record.url?p('발행일: '+(record.sourceDate||'미확인')):''));
    if(!ai?.facts)return;
    const evidence=ai.facts.map(f=>`<li><span class="analysis-label">${f.kind==='source_fact'?'자료에서 확인한 사실':f.kind==='author_claim'?'자료 작성자의 주장':'기존 분석 · 사실/주장 구분 전'}</span>${p(f.claim)}<blockquote>${esc(f.quote)}</blockquote><small>${esc(locationOf(record,f.quote))}</small></li>`).join('');
    host.innerHTML+=part('핵심 요약',p(ai.summary))
      +part('주요 근거',`<ol class="analysis-evidence">${evidence}</ol><small>인용이 본문에 있는지 대조한 결과이며, 내용 자체를 외부 검증했다는 뜻은 아니에요.</small>`)
      +part('해석과 한계','<span class="analysis-label">AI의 해석</span>'+p(ai.interpretation.connection)+p(ai.interpretation.difference)+`<ul>${ai.unknowns.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`)
      +part('나에게 남길 질문',p(ai.question)+(ai.clarification!==ai.question?p(ai.clarification):''))
      +part('다시 쓸 방법','<span class="analysis-label">새로운 창작 제안</span>'+p(ai.useCase||'활용 상황은 아직 분류되지 않았어요.')+p(ai.action.task)+p('남길 결과물: '+ai.action.deliverable)+p('확인 방법: '+ai.action.check)+p('다시 찾을 검색어: '+(ai.keywords?.join(' · ')||'기존 분석에는 검색어가 없어요.')));
  };
})();
