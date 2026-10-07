/* User-confirmed provenance is local to this browser, never a global seed change. */
if(location.hash==='#my-records'){
  const ids=new Set(['daangn-dangbeoni','design-memory','voice-capture','image-timeline','text-question']);
  const records=state.records.filter(r=>ids.has(r.id));
  const panel=document.createElement('section');
  panel.className='reuse-panel';panel.id='record-ownership';
  panel.innerHTML='<h2>제공한 기록을 내 기록으로 설정</h2><p>아래 기록의 기본 제공 자료 표시를 없애고 이 기기의 내 기록으로 분류합니다. 내용과 저장 날짜는 유지하며, 과거 사용 횟수를 새로 만들지 않습니다.</p><ul>'+records.map(r=>'<li>'+esc(r.title)+'</li>').join('')+'</ul><button type="button" id="confirm-record-ownership">'+records.length+'개 기록을 내 기록으로 설정</button><p role="status" id="record-ownership-status"></p>';
  document.querySelector('[data-screen="home"] .page').prepend(panel);
  panel.querySelector('button').disabled=!records.length;
  panel.querySelector('button').onclick=()=>{
    for(const record of records){record.ownership='user-confirmed';record.isExample=false;record.ownershipConfirmedAt=new Date().toISOString();}
    try{persist();renderAll();panel.querySelector('button').disabled=true;panel.querySelector('#record-ownership-status').textContent=records.length+'개를 내 기록으로 설정했어요. 기록 서가에서 확인하세요.';history.replaceState({},'',location.pathname+location.search);}catch{panel.querySelector('#record-ownership-status').textContent='저장하지 못했어요. 기록 보관함 상태를 확인해 주세요.';}
  };
}
