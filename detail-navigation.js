/* Keep the record's back button reachable and preserve a writing session during source review. */
(()=>{
  const detail=$('#detail-view'),creator=$('#creator-view'),back=$('#close-detail');
  let lastTop=0,upDistance=0,downDistance=0,returnToCreator=null;
  const originalOpen=openRecord;
  openRecord=function(id,options){originalOpen(id,options);if(detail.classList.contains('active')){detail.classList.remove('header-hidden');lastTop=detail.scrollTop;upDistance=downDistance=0;}};
  const originalCreator=openCreator;
  openCreator=function(options){if(returnToCreator&&detail.classList.contains('active')){returnToCreator=null;back.setAttribute('aria-label','기록 닫기');}return originalCreator(options);};
  detail.addEventListener('scroll',()=>{
    if(!detail.classList.contains('active'))return;
    const top=detail.scrollTop,delta=top-lastTop;lastTop=top;
    if(top<60){detail.classList.remove('header-hidden');upDistance=downDistance=0;return;}
    if(delta>2){downDistance+=delta;upDistance=0;if(top>140&&downDistance>48)detail.classList.add('header-hidden');}
    else if(delta< -2){upDistance-=delta;downDistance=0;if(upDistance>28)detail.classList.remove('header-hidden');}
  },{passive:true});
  window.memoiveOpenRecordFromCreator=id=>{
    if(!creator.classList.contains('active')||!state.records.some(r=>r.id===id))return false;
    const position=creator.scrollTop,focus=document.activeElement,workspaceId=window.memoiveWorkOutputMetadata?.().workspaceId;
    if(!window.memoiveCloseWork?.())return false;
    returnToCreator={position,focus,workspaceId};
    openRecord(id);
    back.setAttribute('aria-label','창작으로 돌아가기');
    return true;
  };
  const originalClose=back.onclick;
  back.onclick=()=>{
    if(!returnToCreator){originalClose?.();return;}
    const previous=returnToCreator;returnToCreator=null;
    detail.classList.remove('active','header-hidden');creator.classList.add('active');
    back.setAttribute('aria-label','기록 닫기');
    requestAnimationFrame(()=>{creator.scrollTop=previous.position;previous.focus?.focus?.({preventScroll:true});});
  };
  window.memoiveReturnAfterRecordDeletion=()=>{
    if(!returnToCreator)return false;
    const previous=returnToCreator;returnToCreator=null;
    back.setAttribute('aria-label','기록 닫기');
    if(previous.workspaceId&&state.workspaces?.some(w=>w.id===previous.workspaceId)){
      openCreator({workspaceId:previous.workspaceId});
      requestAnimationFrame(()=>{creator.scrollTop=previous.position;});
      toast('기록을 삭제했어요. 작성 중인 글은 그대로예요.');
      return true;
    }
    return false;
  };
})();
