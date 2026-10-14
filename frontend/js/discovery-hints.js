/* Surface features people asked for that already exist: reminders, quick mobile capture, video transcripts. */
(()=>{
  const SEEN_KEY='memoive-hints-v1',VISIT_KEY='memoive-visits-v1';
  const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value))}catch{}};
  const seen=()=>read(SEEN_KEY)||{};
  const markSeen=id=>write(SEEN_KEY,{...seen(),[id]:new Date().toISOString()});
  const visits=(Number(read(VISIT_KEY))||0)+1;write(VISIT_KEY,visits);

  // One hint at a time; each closes on its own buttons and never blocks the page.
  let current=null;
  function showHint({id,title,body,accept,acceptLabel}){
    if(seen()[id]||current)return;
    const hint=document.createElement('aside');
    hint.className='discovery-hint';hint.setAttribute('role','status');hint.dataset.hint=id;
    hint.innerHTML=`<strong>${esc(title)}</strong><p>${esc(body)}</p><div><button type="button" data-hint-accept>${esc(acceptLabel)}</button><button type="button" data-hint-dismiss>괜찮아요</button></div>`;
    const close=outcome=>{markSeen(id);track(`hint_${outcome}`,{type:id});hint.remove();current=null};
    hint.querySelector('[data-hint-accept]').onclick=async()=>{close('accepted');await accept()};
    hint.querySelector('[data-hint-dismiss]').onclick=()=>close('dismissed');
    document.body.append(hint);current=hint;
    track('hint_shown',{type:id});
  }

  function maybeReminderHint(){
    const notificationsReady=!('Notification'in window)||Notification.permission!=='default';
    if(state.resurface&&notificationsReady)return markSeen('reminder');
    setTimeout(()=>showHint({
      id:'reminder',
      title:'잊기 전에 다시 꺼내드릴까요?',
      body:'정한 날이 되면 저장한 기록과 다시 생각해 볼 질문을 보여드려요. 빈도와 시간은 설정에서 바꿀 수 있어요.',
      acceptLabel:'다시 보기 켜기',
      accept:async()=>{state.resurface=true;persist();renderAll();if('Notification'in window&&Notification.permission==='default')await enableNotifications();else toast('다시 보기를 켰어요.')}
    }),2600);
  }

  const originalTrack=track;
  track=function(name,options){const result=originalTrack(name,options);if(name==='record_saved')maybeReminderHint();return result};

  // Share targets need an installed app, so only suggest it on a phone that has not installed MEMOIVE yet.
  const installed=window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true;
  const phone=window.matchMedia?.('(pointer: coarse)').matches&&window.innerWidth<768;
  if(phone&&!installed&&visits>=2)setTimeout(()=>showHint({
    id:'mobile-capture',
    title:'떠오를 때 바로 기록하기',
    body:'홈 화면에 추가하면 앱처럼 바로 열려요. 지원하는 휴대폰에서는 다른 앱의 ‘공유’ 메뉴에서 MEMOIVE를 골라 링크를 바로 저장할 수 있어요.',
    acceptLabel:'홈 화면에 추가',
    accept:installApp
  }),1500);

  // Inline, contextual: shown whenever a YouTube address is typed, not once.
  const VIDEO_NOTE='영상 주소예요. 공개 자막이 있으면 자막으로 요약해 드려요. 자막이 없으면 직접 붙여넣을 수 있어요.';
  const isYouTube=value=>{try{const host=new URL(value).hostname.replace(/^www\./,'');return DataTools.linkType(value)==='video'&&/(^|\.)youtube(-nocookie)?\.com$|^youtu\.be$/.test(host)}catch{return false}};
  const link=$('#capture-link'),status=$('#link-status');
  link?.addEventListener('input',()=>{
    if(isYouTube(link.value.trim()))status.textContent=VIDEO_NOTE;
    else if(status.textContent===VIDEO_NOTE)status.textContent='';
  });

  const settings=$('#notification-status');
  if(settings){
    const replay=document.createElement('button');
    replay.type='button';replay.className='hint-replay';replay.textContent='사용 안내 다시 보기';
    replay.onclick=()=>{write(SEEN_KEY,{});toast('다음에 해당 화면에서 안내를 다시 보여드려요.')};
    settings.after(replay);
  }
})();
