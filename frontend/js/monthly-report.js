/* P2 ④ — a monthly look back, computed on this device; the AI summary is optional and consented. */
(()=>{
  // Extensions must never break saving or opening records; failures are logged, not thrown.
  const safely=fn=>{try{fn();}catch(error){console.error('[MEMOIVE]',error);}};
  const R=ReflectionTools,ENDPOINT=String(window.MEMOIVE_REFLECTION_ENDPOINT||'').trim();
  const TYPE_LABELS={article:'링크·기사',video:'영상',image:'이미지',voice:'음성',text:'텍스트'};
  const monthLabel=m=>`${m.slice(0,4)}년 ${Number(m.slice(5))}월`;
  const perspectiveName=id=>PerspectiveTools.find(id,state.perspectives)?.name||'삭제된 관점';
  const host=document.createElement('section');
  host.className='monthly-report';host.setAttribute('aria-labelledby','monthly-report-title');
  // The insights page re-renders its own content, so the report re-attaches itself when needed.
  const attach=()=>{if(!host.isConnected)$('[data-screen="insights"] .page-title')?.after(host);};
  const find=selector=>host.querySelector(selector);
  let month='',picked=false,busy=false,consentMonth='';

  const previousMonth=()=>{const d=new Date(TODAY_DATE.getFullYear(),TODAY_DATE.getMonth()-1,1);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;};
  const bars=(rows,total,label=x=>x)=>rows.slice(0,5).map(([key,count])=>`<li><span>${esc(label(key))}</span><i style="--share:${Math.round(count/total*100)}%"></i><b>${count}</b></li>`).join('');
  // Only records with the person's own thought are offered for the AI summary.
  const summaryRecords=()=>state.records.filter(r=>!DataTools.isExample(r)&&r.savedAt.startsWith(month)&&r.thought?.trim()).slice(0,40);
  const payload=records=>({month,records:records.map(r=>({title:r.title.slice(0,160),thought:r.thought.trim().slice(0,500),topics:(r.topics||[]).slice(0,5)}))});

  function render(){
    attach();
    const months=R.reportMonths(state.records,DataTools.isExample);
    if(!months.length){host.innerHTML='<p class="eyebrow">MONTHLY LOOK BACK</p><h2 id="monthly-report-title">월간 회고</h2><p class="report-empty">직접 남긴 기록이 생기면 달마다 무엇을 모았는지 보여드려요.</p>';return;}
    // Until the person picks a month, default to last month when it has records.
    if(!picked||!months.includes(month))month=months.includes(previousMonth())?previousMonth():months[0];
    const report=R.monthlyReport(state.records,month,{isExample:DataTools.isExample,localDay:DataTools.localDay,relate:DataTools.relatedRecords,perspectiveName});
    const saved=state.reflections[month],records=summaryRecords();
    host.innerHTML=`<div class="section-head"><div><p class="eyebrow">MONTHLY LOOK BACK</p><h2 id="monthly-report-title">월간 회고</h2></div><label class="sr-only" for="report-month">회고할 달</label><select id="report-month">${months.map(m=>`<option value="${m}" ${m===month?'selected':''}>${monthLabel(m)}</option>`).join('')}</select></div>
    <div class="report-stats"><span><strong>${report.total}</strong><small>남긴 기록</small></span><span><strong>${report.thoughtRate}%</strong><small>생각을 남긴 비율</small></span><span><strong>${report.revisitedIds.length}</strong><small>다시 돌아와 생각을 더한 기록</small></span></div>
    ${report.enough?`<div class="report-bars"><h3>주제</h3><ul>${bars(report.byTopic,report.total)||'<li class="report-empty">주제가 없어요</li>'}</ul><h3>관점</h3><ul>${bars(report.byPerspective,report.total)||'<li class="report-empty">관점별 생각이 없어요</li>'}</ul><h3>형식</h3><ul>${bars(report.byType,report.total,k=>TYPE_LABELS[k]||k)}</ul></div>
    ${report.bias?`<p class="report-bias">이번 달은 ‘${esc(report.bias.topic)}’에 ${report.bias.share}% 집중했어요. 다른 관점의 기록도 남겨볼까요?</p>`:''}
    ${report.mostConnected?`<button type="button" class="report-connected" data-record-id="${esc(report.mostConnected.id)}"><small>가장 많이 이어진 기록 · 연결 ${report.mostConnected.count}개</small><strong>${esc(report.mostConnected.title)}</strong></button>`:''}`
    :`<p class="report-empty">이 달의 기록은 ${report.total}개예요. 기록이 ${R.MIN_REPORT_RECORDS}개 이상 모이면 주제·관점·형식 분포를 보여드려요.</p>`}
    <div class="report-ai"><h3>반복된 생각 · 선택</h3>${saved?renderSummary(saved):''}
    ${ENDPOINT?`${records.length>=2?`<label class="question-consent"><input type="checkbox" id="report-consent" ${consentMonth===month?'checked':''}><span>이 달에 생각을 남긴 기록 ${records.length}개의 제목·내 생각·주제를 Gemini로 보내 요약받기</span></label><details><summary>보낼 내용 보기</summary><pre>${esc(JSON.stringify(payload(records),null,2))}</pre><small>무료 등급에서는 전송 내용이 Google 제품 개선에 사용될 수 있어요. 개인정보·비밀 자료는 보내지 마세요.</small></details><button type="button" id="report-summarize" ${busy||consentMonth!==month?'disabled':''}>${busy?'요약하는 중…':saved?'다시 요약 받기':'반복된 생각 요약 받기'}</button>`:'<p class="report-empty">생각을 남긴 기록이 2개 이상이면 반복된 생각을 요약받을 수 있어요.</p>'}`:'<p class="report-empty">AI 연결 후 사용할 수 있어요.</p>'}
    <p id="report-status" role="status" aria-live="polite"></p></div>`;
    find('#report-month').onchange=event=>{month=event.target.value;picked=true;render();};
    find('#report-consent')?.addEventListener('change',event=>{consentMonth=event.target.checked?month:'';render();});
    find('#report-summarize')?.addEventListener('click',summarize);
    host.querySelectorAll('[data-theme-index]').forEach(b=>b.onclick=()=>window.memoiveOpenPrinciple({evidenceIds:saved.themes[Number(b.dataset.themeIndex)].recordIds}));
    bindRecordButtons();
  }
  function renderSummary(saved){
    const title=id=>state.records.find(r=>r.id===id)?.title;
    return `<ol class="report-themes">${saved.themes.map((t,i)=>{const titles=t.recordIds.map(title).filter(Boolean);return `<li><strong>${esc(t.theme)}</strong><small>근거 기록: ${titles.length?titles.map(esc).join(' · '):'삭제된 기록'}</small>${titles.length>=R.MIN_EVIDENCE?`<button type="button" data-theme-index="${i}">이 생각으로 원칙 만들기</button>`:''}</li>`}).join('')}</ol>${saved.explore.length?`<p class="report-explore-title">다음 달에 더 알아볼 것</p><ul class="report-explore">${saved.explore.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}<small class="report-note">AI가 내 생각에서 찾은 요약이에요. ${esc(DataTools.localDay(saved.createdAt).replaceAll('-','.'))}에 받았어요.</small>`;
  }
  async function summarize(){
    const records=summaryRecords(),forMonth=month;
    if(busy||consentMonth!==forMonth||records.length<2)return;
    busy=true;render();
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
    let message='';
    try{
      const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload(records)),signal:controller.signal});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!Array.isArray(data.themes))throw Object.assign(new Error(data.message||''),{status:response.status});
      // Indexes from the AI are mapped back to the records that were actually sent.
      const reflection=R.cleanReflections({[forMonth]:{themes:data.themes.map(t=>({theme:t.theme,recordIds:(t.records||[]).map(i=>records[i]?.id).filter(Boolean)})),explore:data.explore,createdAt:new Date().toISOString()}})[forMonth];
      if(!reflection)throw new Error('반복된 생각을 찾지 못했어요.');
      const before=state.reflections;state.reflections={...state.reflections,[forMonth]:reflection};
      try{persist();}catch{state.reflections=before;throw new Error('저장하지 못했어요.');}
      track('reflection_received',{value:forMonth});
    }catch(error){message=error.status===429?'요청이 많아요. 잠시 후 다시 시도해 주세요.':error.message||'요약을 받지 못했어요. 기록은 그대로예요.';}
    finally{clearTimeout(timer);busy=false;render();if(message)find('#report-status').textContent=message;}
  }
  const originalRenderInsights=renderInsights;
  renderInsights=function(){originalRenderInsights();safely(render);};
  render();
})();
