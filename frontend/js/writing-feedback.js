/* Feedback on the person's own draft. The AI comments; it never edits the text. */
(()=>{
  const ENDPOINT=String(window.MEMOIVE_FEEDBACK_ENDPOINT||'').trim();
  const ASPECTS=[['claim','주장이 분명한가'],['evidence','근거 기록과 이어지는가'],['separation','내 생각과 출처가 구분되는가'],['counterpoint','빠진 반론·조건']];
  const panel=document.createElement('section');
  panel.className='writing-feedback';panel.setAttribute('aria-labelledby','writing-feedback-title');
  panel.innerHTML=`<h3 id="writing-feedback-title">쓴 글 피드백</h3><p>AI가 글을 고치지 않고, 네 가지 기준으로 의견만 드려요. 반영할지는 직접 정해요.</p>
  <button type="button" class="secondary solid" id="request-writing-feedback">${ENDPOINT?'피드백 받기':'AI 연결 후 사용할 수 있어요'}</button>
  <p id="writing-feedback-status" role="status" aria-live="polite"></p><div id="writing-feedback-result"></div>`;
  $('#output-sources').after(panel);
  const button=$('#request-writing-feedback'),status=$('#writing-feedback-status'),result=$('#writing-feedback-result');
  button.disabled=!ENDPOINT;
  // The older rewrite request stays available, labelled as the secondary option.
  const refine=$('#ai-refine-output');if(refine)refine.textContent='표현 제안 받기 · 보조';

  async function requestFeedback(){
    const title=$('#output-title').value.trim(),body=$('#output-body').value.trim();
    if(!title||body.length<80)return status.textContent='제목과 80자 이상의 본문을 쓴 뒤 피드백을 받을 수 있어요.';
    if(body.length>9000)return status.textContent='본문이 9,000자를 넘어요. 피드백 받을 부분만 남겨 주세요.';
    const records=selectedCreatorRecords().slice(0,8).map(r=>({title:r.title.slice(0,160),summary:(r.summary||'').slice(0,1600),thought:(r.thought||'').slice(0,1000)}));
    const payload={title:title.slice(0,160),body,purpose:$('#output-purpose').value.trim().slice(0,600),viewpoint:$('#output-viewpoint').value.trim().slice(0,1200),records};
    if(!await window.memoiveConfirm(`작성 중인 글의 제목·본문, 전달 목적, 내 관점과 참고 기록 ${records.length}개의 요약·내 생각을 Google Gemini로 보내 피드백을 받을까요? 글은 바뀌지 않아요. 무료 등급에서는 전송 내용이 Google 제품 개선에 사용될 수 있어요. 개인정보·비밀 자료는 보내지 마세요.`))return status.textContent='전송하지 않았어요.';
    button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='글을 읽고 의견을 정리하는 중이에요…';
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||ASPECTS.some(([key])=>typeof data[key]!=='string'))throw Object.assign(new Error(data.message||''),{status:response.status});
      const changed=$('#output-body').value.trim()!==body;
      result.innerHTML=`<dl>${ASPECTS.map(([key,label])=>`<dt>${esc(label)}</dt><dd>${esc(data[key])}</dd>`).join('')}</dl><small>${changed?'요청한 뒤 글이 바뀌었어요. 이 의견은 보내던 시점의 글 기준이에요. ':''}AI 의견이에요. 사실 여부와 반영은 직접 판단해 주세요.</small>`;
      status.textContent='';
      track('writing_feedback_received',{value:$('#output-type').value});
    }catch(error){
      status.textContent=error.status===429?'요청이 많아요. 잠시 후 다시 시도해 주세요. 글은 그대로예요.':error.message||'피드백을 받지 못했어요. 글은 그대로예요.';
    }finally{clearTimeout(timer);button.disabled=false;button.removeAttribute('aria-busy');}
  }
  button.onclick=requestFeedback;
})();
