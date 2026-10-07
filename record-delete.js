/* Remove any saved record from this device. Keep written outputs. */
(()=>{
  const section=document.createElement('section');
  section.className='record-delete-section';
  section.hidden=true;
  section.innerHTML='<button id="delete-record" type="button">이 기록 삭제</button><small>이 기록의 본문·분석·내 생각이 이 기기에서 삭제돼요.</small>';
  $('#detail-view main').append(section);
  const originalOpenRecord=openRecord;
  openRecord=function(id,options){originalOpenRecord(id,options);const record=state.records.find(r=>r.id===id);section.hidden=!record};
  const originalRenderLibrary=renderLibrary;
  renderLibrary=function(){
    originalRenderLibrary();
    $('#record-list').querySelectorAll('.record-item[data-record-id]').forEach(row=>{
      const record=state.records.find(r=>r.id===row.dataset.recordId);
      if(!record)return;
      const entry=document.createElement('div'),button=document.createElement('button');
      entry.className='record-list-entry';row.before(entry);entry.append(row);
      button.type='button';button.className='library-delete';button.textContent='삭제';
      button.setAttribute('aria-label',`${record.title} 기록 삭제`);
      button.onclick=()=>deleteRecord(record.id);entry.append(button);
    });
  };
  renderLibrary();
  $('#delete-record').onclick=()=>deleteRecord(state.currentId);
  async function deleteRecord(id){
    const record=state.records.find(r=>r.id===id);
    if(!record)return;
    const outputs=state.outputs.filter(o=>o.sourceRecordIds?.includes(record.id)).length;
    const works=(state.workspaces||[]).filter(w=>w.selected?.includes(record.id)||w.traces?.some(t=>t.recordId===record.id)).length;
    const linked=outputs||works?`\n연결된 결과물 ${outputs}개와 임시 글 ${works}개는 유지하고, 이 기록과의 연결만 끊어요.`:'';
    const example=DataTools.isExample(record);
    if(!window.confirm(example
      ? `“${record.title}”을 목록에서 삭제할까요?\n이 기기에 보관된 이 기록의 내용과 내 생각이 함께 삭제됩니다.${linked}\n새로고침해도 다시 표시되지 않아요.`
      : `“${record.title}” 기록을 삭제할까요?\n저장한 본문·분석·내 생각${['image','voice'].includes(record.type)?'·첨부 원본':''}을 삭제합니다.${linked}\n삭제 후에는 되돌릴 수 없어요.`))return;
    const before={records:state.records,dismissedExampleIds:state.dismissedExampleIds,outputs:state.outputs,workspaces:state.workspaces,analytics:state.analytics};
    if(DataTools.isExample(record)||CaseStudies.records.some(sample=>sample.id===record.id)||['daangn-dangbeoni','design-memory','voice-capture','image-timeline','text-question'].includes(record.id)){
      state.dismissedExampleIds=[...new Set([...state.dismissedExampleIds,record.id])];
    }
    state.records=state.records.filter(r=>r.id!==record.id);
    state.outputs=state.outputs.map(o=>({...o,sourceRecordIds:(o.sourceRecordIds||[]).filter(id=>id!==record.id),sourceLinkedAt:Object.fromEntries(Object.entries(o.sourceLinkedAt||{}).filter(([id])=>id!==record.id)),traces:(o.traces||[]).filter(t=>t.recordId!==record.id)}));
    state.workspaces=(state.workspaces||[]).map(w=>({...w,selected:(w.selected||[]).filter(id=>id!==record.id),decisions:Object.fromEntries(Object.entries(w.decisions||{}).filter(([id])=>id!==record.id)),traces:(w.traces||[]).filter(t=>t.recordId!==record.id),reusedThoughts:(w.reusedThoughts||[]).filter(id=>id!==record.id)}));
    state.analytics={...state.analytics,events:(state.analytics.events||[]).filter(event=>event.recordId!==record.id)};
    try{persist()}catch(error){Object.assign(state,before);toast('저장 공간 문제로 삭제하지 못했어요. 기록은 그대로예요.');return}
    const detailWasOpen=$('#detail-view').classList.contains('active')&&state.currentId===record.id;
    if(state.currentId===record.id)state.currentId=null;
    if(state.pendingDuplicateId===record.id)state.pendingDuplicateId=null;
    if(detailWasOpen)$('#detail-view').classList.remove('active');
    renderAll();const returned=detailWasOpen&&window.memoiveReturnAfterRecordDeletion?.();if(!returned&&state.screen!=='library')go('library');
    if(['image','voice'].includes(record.type)){
      try{await OriginalStore.delete(record.id)}catch{toast('기록은 삭제됐지만 첨부 원본 삭제에 실패했어요. 브라우저 저장 공간을 확인해 주세요.');return}
    }
    if(!returned)toast('기록을 삭제했어요. 작성한 결과물과 임시 글은 그대로예요.');
  }
})();
