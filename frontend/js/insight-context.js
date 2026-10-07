/* Context choices are opt-in and never trigger a network request. */
const insightDrafts=new Map();
const INSIGHT_BODY_MAX_CHARS=60000;
const legacyRenderInsight=renderInsight;
function insightDraft(record){
  if(!insightDrafts.has(record.id))insightDrafts.set(record.id,{thought:false,concern:false,output:false,concernText:record.insightContextDraft?.concernText||'',outputText:record.insightContextDraft?.outputText||'',excerpt:''});
  return insightDrafts.get(record.id);
}
function selectedInsightContext(record){
  const draft=insightDraft(record),selected={};
  if(draft.thought&&record.thought?.trim()&&record.thought.length<=1000)selected.thought=record.thought;
  if(draft.concern&&draft.concernText.trim())selected.concern=draft.concernText;
  if(draft.output&&draft.outputText.trim())selected.output=draft.outputText;
  return MemoiveContract.context(selected);
}
function insightBody(record){return record.sourceBody?.length>INSIGHT_BODY_MAX_CHARS?insightDraft(record).excerpt:(record.sourceBody||'');}
function insightReady(record){const body=insightBody(record);return body.trim().length>=80&&body.length<=INSIGHT_BODY_MAX_CHARS&&(!record.sourceBody||record.sourceBody.includes(body));}
function renderInsightResult(record){
  const ai=InsightTools.current(record,state.role),host=$('#insight-structured');
  const resultKey=JSON.stringify([record.id,state.role,ai||null,DataTools.isExample(record)]);
  if(host.dataset.resultKey===resultKey)return;
  host.dataset.resultKey=resultKey;
  // One place for each claim and its exact source; never present raw input as AI key points.
  const section=$('#source-evidence-details'),points=$('#detail-points'),example=DataTools.isExample(record);
  $('#summary-expanded').hidden=true;
  $('#ai-evidence').hidden=true;
  section.querySelector('.evidence').hidden=!example||!!ai;
  $('#detail-quote').hidden=true;
  section.querySelector('.points .eyebrow').textContent=ai?.facts?'핵심 내용 · AI 정리':example?'핵심 내용':'AI 정리 전';
  let prompt=$('#key-points-prompt');
  if(!prompt){prompt=document.createElement('div');prompt.id='key-points-prompt';points.after(prompt);}
  points.hidden=!ai?.facts&&!example;
  prompt.hidden=!!ai?.facts||example;
  if(ai?.facts){points.innerHTML=ai.facts.map(f=>`<li><div><span>${esc(f.claim)}</span><details class="key-point-source"><summary>이 내용의 원문 근거</summary><p>“${esc(f.quote)}”</p></details></div></li>`).join('');}
  else if(!example){prompt.innerHTML='<p>아직 AI로 정리하지 않은 기록이에요. 원문을 바탕으로 핵심 내용을 묶고, 읽기 쉬운 문장으로 정리할 수 있어요.</p><button type="button" class="secondary solid" id="prepare-key-points">전송 내용 확인하고 AI로 정리하기</button>';$('#prepare-key-points').onclick=()=>{const options=$('.insight-options');options.open=true;options.scrollIntoView({block:'start',behavior:'smooth'});$('#insight-consent').focus({preventScroll:true});};}
  host.hidden=!ai?.facts;
  if(!ai?.facts){host.innerHTML='';return;}
  const userContext=Object.entries(ai.inputContext||{}).map(([key,value])=>`<p><strong>${esc({thought:'내 생각',concern:'현재 고민',output:'원하는 결과물'}[key]||key)}</strong> ${esc(value)}</p>`).join('');
  host.innerHTML=`<summary>근거·적용 방법 자세히 보기</summary><div class="insight-result">
    <h4>MEMOIVE 해석 · 적용 가설</h4><p>${esc(ai.interpretation.connection)}</p><p><b>그대로 적용하기 어려운 점</b> ${esc(ai.interpretation.difference)}</p>
    <h4>구체적으로 해볼 일 · 제안</h4><p>${esc(ai.action.task)}</p><p><b>남길 결과물</b> ${esc(ai.action.deliverable)}</p><p><b>확인 방법</b> ${esc(ai.action.check)}</p>
    <h4>아직 확인되지 않은 점</h4><ul>${ai.unknowns.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <p><b>더 맞추기 위한 질문</b> ${esc(ai.clarification)}</p>
    <details><summary>이 답변에 사용한 내 맥락</summary>${userContext||'<p>개인 맥락 없이 원문과 선택 관점만 사용한 일반적인 적용 제안이에요.</p>'}</details>
    <small>인용 구절이 전송한 본문에 있는지 검사했어요. 이 검사만으로 AI 해석의 정확성이나 효과가 검증되지는 않아요. 본문 일부를 보냈다면 그 범위만 분석한 결과예요.</small></div>`;
}
renderInsight=function(record){
  legacyRenderInsight(record);
  const host=$('#insight-flow'),draft=insightDraft(record),busy=insightJobs.has(record.id),reading=record.fetchStatus==='reading',body=insightBody(record);
  if(host.dataset.recordId!==record.id||host.dataset.role!==state.role){
    host.dataset.recordId=record.id;host.dataset.role=state.role;$('#insight-consent').checked=false;
    $('#context-thought').checked=draft.thought;$('#context-concern').checked=draft.concern;$('#context-output').checked=draft.output;
    $('#context-concern-text').value=draft.concernText;$('#context-output-text').value=draft.outputText;$('#insight-excerpt').value=draft.excerpt;
    $('#insight-manual-body').value='';$('#insight-feedback').textContent='';
  }
  if(host.dataset.bodyStamp!==InsightTools.stamp(record)){host.dataset.bodyStamp=InsightTools.stamp(record);$('#insight-consent').checked=false;}
  $('#insight-body-status').textContent=reading?'본문을 읽고 있어요. 완료 후 전송할 내용을 확인해 주세요.':!record.sourceBody?'본문이 있어야 AI 정리를 실행할 수 있어요. 링크만으로 내용을 추측하지 않아요.':record.sourceBody.length>INSIGHT_BODY_MAX_CHARS?'원본은 그대로 보관합니다. 아래에서 AI에 보낼 본문 일부를 80~60,000자로 선택해 주세요.':body.trim().length<80?'저장된 본문이 너무 짧아요. 80자 이상의 본문을 붙여 넣어 주세요.':`본문 ${body.length.toLocaleString()}자 준비됨. 내용을 확인한 뒤 전송에 동의해 주세요.`;
  $('#insight-fetch-body').hidden=!record.url||!!record.sourceBody;
  $('#insight-fetch-body').disabled=reading||busy;
  $('#insight-fetch-body').textContent=reading?'본문 불러오는 중…':'본문 불러오기';
  $('#insight-source-error').textContent=record.fetchStatus==='failed'?(record.fetchError||'자동 읽기가 막혔어요. 아래에 본문을 붙여 넣어 주세요.'):'';
  $('#insight-excerpt-field').hidden=!(record.sourceBody?.length>INSIGHT_BODY_MAX_CHARS);
  $('#insight-context-fields').disabled=busy||!insightReady(record);
  $('#context-thought').disabled=busy||!record.thought?.trim()||record.thought.length>1000;
  $('#context-thought-preview').textContent=record.thought?.length>1000?'내 생각이 1,000자를 넘어요. 보낼 부분만 아래 현재 고민에 적고 선택해 주세요.':record.thought||'아직 남긴 내 생각이 없어요.';
  $('#insight-manual-save').disabled=busy;
  const context=selectedInsightContext(record);
  const consentScope=JSON.stringify({title:record.title,body,role:state.role,context});
  if(host.dataset.consentScope!==consentScope){host.dataset.consentScope=consentScope;$('#insight-consent').checked=false;}
  if(record.sourceBody?.length>INSIGHT_BODY_MAX_CHARS&&draft.excerpt){$('#insight-body-status').textContent=insightReady(record)?`선택한 본문 ${body.length.toLocaleString()}자를 보냅니다. 원본은 그대로 보관해요.`:'저장한 본문과 일치하는 연속된 부분을 80~60,000자로 붙여 넣어 주세요.';}
  $('#insight-send-preview').textContent=JSON.stringify({title:record.title,body,role:state.role,context},null,2);
  $('#insight-status').textContent=!INSIGHT_ENDPOINT?'AI 연결을 확인할 수 없어요. 본문과 내 생각은 계속 보관됩니다.':'제목·선택한 본문·관점과 아래에서 선택한 맥락만 Google Gemini로 보냅니다. 무료 등급에서는 전송 내용이 Google 제품 개선에 사용될 수 있으니 개인정보·비밀 자료는 제외해 주세요.';
  $('#insight-consent-row').hidden=false;
  $('#insight-consent').disabled=!INSIGHT_ENDPOINT||!insightReady(record)||busy;
  $('#insight-request').disabled=!INSIGHT_ENDPOINT||!insightReady(record)||!$('#insight-consent').checked||busy;
  $('#insight-request').textContent=busy?'근거와 적용 방법 정리 중…':'AI로 정리하기';
  $('#insight-request').setAttribute('aria-busy',String(busy));
  renderInsightResult(record);
};
requestRecordInsight=async function(){
  const record=state.records.find(r=>r.id===state.currentId);
  if(!record||!insightReady(record)||!INSIGHT_ENDPOINT||!$('#insight-consent').checked||insightJobs.has(record.id))return;
  const id=record.id,role=state.role,stamp=InsightTools.stamp(record),body=insightBody(record),context=selectedInsightContext(record),draft=insightDraft(record);
  const payload={title:record.title,body,role,context,protocolVersion:2};
  insightJobs.add(id);$('#insight-feedback').textContent='';renderInsight(record);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
  let feedback='',measurement='failed',failureReason='other';
  try{
    const response=await fetch(INSIGHT_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify(payload)});
    const result=await response.json();if(!response.ok){failureReason=response.status===429?'limit':'other';throw Error(result.message||'AI 요청에 실패했어요.');}
    if(result.protocolVersion!==2)throw Error('새 답변 형식이 준비되지 않았어요. 기존 기록은 그대로예요.');
    const valid=MemoiveContract.validate(result,body),current=state.records.find(r=>r.id===id);
    if(!current||InsightTools.stamp(current)!==stamp||insightBody(current)!==body||JSON.stringify(selectedInsightContext(current))!==JSON.stringify(context)){measurement='discarded';feedback='요청 중 본문이나 맥락이 바뀌어 이전 응답을 적용하지 않았어요. 현재 내용으로 다시 요청해 주세요.';return;}
    current.aiInsights={...current.aiInsights,[role]:{...valid,sourceStamp:stamp,createdAt:new Date().toISOString(),inputContext:context,sourceChars:body.length}};
    current.insightContextDraft={concernText:draft.concernText,outputText:draft.outputText};
    persist();measurement='success';feedback='핵심 내용과 항목별 원문 근거를 정리했어요. 적용 제안은 별도로 확인할 수 있어요.';
  }catch(error){failureReason=error.name==='AbortError'?'timeout':failureReason;feedback=error.name==='AbortError'?'AI 응답이 늦어 중단했어요. 본문·내 생각·기존 AI 결과는 그대로예요.':error.message;}
  finally{if(typeof measureAi==='function'&&!DataTools.isExample(record))measureAi('insight',measurement,{recordId:id,reason:measurement==='failed'?failureReason:''});clearTimeout(timer);insightJobs.delete(id);if(state.currentId===id){$('#insight-consent').checked=false;const current=state.records.find(r=>r.id===id);if(current)renderInsight(current);$('#insight-feedback').textContent=feedback;}}
};
$('#insight-request').onclick=requestRecordInsight;
$('#insight-consent').onchange=()=>{const r=state.records.find(r=>r.id===state.currentId);if(r)renderInsight(r);};
for(const kind of ['thought','concern','output']){
  $('#context-'+kind).onchange=()=>{const r=state.records.find(r=>r.id===state.currentId);if(!r)return;insightDraft(r)[kind]=$('#context-'+kind).checked;$('#insight-consent').checked=false;renderInsight(r);};
}
for(const kind of ['concern','output']){
  $('#context-'+kind+'-text').oninput=()=>{const r=state.records.find(r=>r.id===state.currentId);if(!r)return;insightDraft(r)[kind+'Text']=$('#context-'+kind+'-text').value;$('#insight-consent').checked=false;renderInsight(r);};
}
$('#insight-excerpt').oninput=()=>{const r=state.records.find(r=>r.id===state.currentId);if(r){insightDraft(r).excerpt=$('#insight-excerpt').value;$('#insight-consent').checked=false;renderInsight(r);}};
$('#insight-fetch-body').onclick=()=>{ $('#insight-consent').checked=false;retrySource(); };
$('#insight-manual-save').onclick=()=>{
  const r=state.records.find(r=>r.id===state.currentId),content=$('#insight-manual-body').value.trim();
  if(!r||!content)return;
  try{applyArticle(r,{title:r.title,published:r.sourceDate,content,method:'manual'});persist();renderAll();renderSourceBody(r);renderInsight(r);$('#insight-feedback').textContent='본문을 저장했어요. 전송 항목과 본문을 확인한 뒤 동의해 주세요.';}
  catch(error){$('#insight-feedback').textContent=error.message;}
};
