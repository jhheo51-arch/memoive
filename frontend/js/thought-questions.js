/* Question coach: up to three questions per perspective; the person writes every answer. */
(()=>{
  const ENDPOINT=String(window.MEMOIVE_QUESTION_ENDPOINT||'').trim(),MAX_QUESTIONS=3;
  const sheetApi=window.memoiveThoughtSheet;
  const box=document.createElement('div');
  box.className='question-coach';
  box.innerHTML=`<button type="button" id="ask-question" class="secondary">질문 받기</button>
  <label class="question-consent"${ENDPOINT?'':' hidden'}><input type="checkbox" id="question-consent"><span>AI에게 이 자료에 맞는 질문 받기 · Gemini로 전송</span></label>
  <details id="question-preview-details"${ENDPOINT?'':' hidden'}><summary>보낼 내용 보기</summary><pre id="question-preview"></pre><small>제목, 자료 앞부분 최대 6,000자, 관점, 내 생각 한 줄, 앞 질문과 내 답을 보냅니다. 무료 등급에서는 전송 내용이 Google 제품 개선에 사용될 수 있어요. 개인정보·비밀 자료는 보내지 마세요.</small></details>
  <p id="question-status" role="status" aria-live="polite"></p>`;
  // Right under the answered questions and above the free line, so asking is visible when the sheet opens.
  $('#thought-input').before(box);
  const askButton=$('#ask-question'),consent=$('#question-consent'),status=$('#question-status');
  let consentScope='',busy=false;

  function payload(context){
    const {record,perspective,free,questions}=context;
    return {
      title:record.title.slice(0,200),
      source:(record.sourceBody||record.summary||'').slice(0,6000),
      thought:free.trim().slice(0,1000),
      perspective:{name:perspective.name,prompts:perspective.prompts,base:perspective.base||state.role},
      turns:questions.filter(q=>q.answer.trim()).slice(-2).map(q=>({question:q.prompt.slice(0,200),answer:q.answer.trim().slice(0,1000)}))
    };
  }
  // Consent covers one record and perspective; switching either asks again.
  function refresh(){
    const context=sheetApi.current();if(!context)return;
    if(consentScope!==context.scope){consent.checked=false;consentScope='';}
    const count=context.questions.length;
    askButton.textContent=busy?'질문을 만드는 중…':count?'한 번 더 질문 받기':'질문 받기';
    askButton.disabled=busy||count>=MAX_QUESTIONS;
    if(count>=MAX_QUESTIONS&&!busy)status.textContent='질문은 한 관점에서 3개까지 받을 수 있어요.';
    if(ENDPOINT)$('#question-preview').textContent=JSON.stringify(payload(context),null,2);
  }
  sheetApi.onRender(()=>{if(!busy)status.textContent='';refresh();});
  consent.onchange=()=>{consentScope=consent.checked?sheetApi.current()?.scope||'':'';refresh();};
  $('#question-preview-details').ontoggle=refresh;
  $('#thought-sheet').addEventListener('input',event=>{if(event.target.matches('textarea'))refresh();});

  function addDefault(context,note=''){
    const next=PerspectiveTools.nextDefaultQuestion(context.perspective,context.questions.map(q=>q.prompt));
    if(!next){status.textContent='준비된 질문을 모두 받았어요. 생각을 자유롭게 이어 적어 주세요.';return;}
    sheetApi.addQuestion(next,'question');
    track('question_shown',{recordId:context.record.id,type:context.record.type,value:'default'});
    status.textContent=note;
  }
  async function askQuestion(){
    const context=sheetApi.current();if(!context||busy)return;
    if(context.questions.length>=MAX_QUESTIONS)return refresh();
    const last=context.questions.at(-1);
    if(last&&!last.answer.trim()){status.textContent='먼저 앞 질문에 답해 주세요. 답한 내용이 다음 질문을 정해요.';$(`#thought-sheet textarea[data-prompt="${CSS.escape(last.prompt)}"]`)?.focus();return;}
    if(!ENDPOINT||!consent.checked||consentScope!==context.scope)return addDefault(context);
    busy=true;refresh();status.textContent='';
    const scope=context.scope,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload(context)),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||typeof data.question!=='string'||!data.question.trim())throw Object.assign(new Error(data.message||''),{status:response.status});
      busy=false;
      // A response for a record or perspective the person has left is dropped.
      if(sheetApi.current()?.scope!==scope)return;
      sheetApi.addQuestion(data.question.trim(),'ai-question');
      track('question_shown',{recordId:context.record.id,type:context.record.type,value:'ai'});
    }catch(error){
      busy=false;
      const current=sheetApi.current();
      if(current?.scope===scope)addDefault(current,error.status===429?'AI 요청이 많아 기본 질문을 드려요. 잠시 후 다시 시도할 수 있어요.':'AI 질문을 받지 못해 기본 질문을 드려요. 쓰던 내용은 그대로예요.');
    }finally{clearTimeout(timer);busy=false;refresh();}
  }
  askButton.onclick=askQuestion;

  // One way in from the record: its own question becomes the first question in the sheet.
  function answerRecordQuestion(){
    const id=state.currentId;openThought(id);
    const context=sheetApi.current();if(!context)return;
    if(context.questions.length)return;
    const recordQuestion=$('#detail-question').textContent.trim();
    if(!recordQuestion)return askQuestion();
    sheetApi.addQuestion(recordQuestion,'question');
    track('question_shown',{recordId:id,type:context.record.type,value:'record'});
  }
  const answer=$('#answer-question');
  answer.textContent='이 질문에 답하며 생각 남기기';
  answer.onclick=answerRecordQuestion;
  // Records without a thought also offer it under the title, so it is visible right after saving.
  const heroButton=document.createElement('button');
  heroButton.type='button';heroButton.id='hero-thought-cta';heroButton.textContent='질문에 답하며 내 생각 남기기';heroButton.hidden=true;
  $('#detail-tags').after(heroButton);
  heroButton.onclick=answerRecordQuestion;
  const originalOpenRecord=openRecord;
  openRecord=function(id,options){
    originalOpenRecord(id,options);
    const record=state.records.find(r=>r.id===id);
    heroButton.hidden=!record||!!record.thought?.trim();
  };
})();
