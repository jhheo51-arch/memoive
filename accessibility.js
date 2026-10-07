/* Dialog focus, keyboard access and draft protection, without changing layouts. */
(()=>{
  const panels=[...document.querySelectorAll('.sheet,.detail,.creator')];
  const focusable='button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]';
  const visible=el=>el.getClientRects().length&&!el.closest('[hidden],.hidden,[inert]');
  let current=null,returnFocus=null;
  let pendingConfirmation=null;
  window.memoiveConfirm=message=>{
    if(pendingConfirmation)return Promise.resolve(false);
    return new Promise(resolve=>{
      const host=document.querySelector('#creator-view'),previous=document.activeElement,box=document.createElement('section');
      box.className='draft-confirmation';box.setAttribute('role','group');box.setAttribute('aria-label','작성한 글 보호');
      const text=document.createElement('p');text.textContent=message;
      const cancel=document.createElement('button'),accept=document.createElement('button');cancel.type=accept.type='button';cancel.textContent='지금 글 유지';accept.textContent='계속 진행';
      const finish=value=>{box.remove();pendingConfirmation=null;previous?.focus();resolve(value)};
      cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);pendingConfirmation=()=>finish(false);
      box.append(text,cancel,accept);host.querySelector('header').after(box);cancel.focus();cancel.scrollIntoView({block:'center'});
    });
  };
  const stack=[];
  panels.forEach(panel=>{
    panel.setAttribute('role','dialog');panel.tabIndex=-1;
    if(!panel.hasAttribute('aria-labelledby')){
      const heading=panel.querySelector('h1,h2');
      if(heading){heading.id=heading.id||`${panel.id}-heading`;panel.setAttribute('aria-labelledby',heading.id);}
    }
    panel.querySelectorAll('.close-sheet').forEach(button=>{if(!button.hasAttribute('aria-label'))button.setAttribute('aria-label','창 닫기');});
  });
  const labels={'thought-input':'나의 생각','revisit-select':'다시 꺼내볼 날짜'};
  Object.entries(labels).forEach(([id,label])=>document.getElementById(id)?.setAttribute('aria-label',label));
  const toast=document.getElementById('toast');toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  function sync(){
    const active=panels.filter(panel=>panel.classList.contains('active'));
    for(let i=stack.length-1;i>=0;i--)if(!active.includes(stack[i]))stack.splice(i,1);
    active.forEach(panel=>{if(!stack.includes(panel))stack.push(panel);});
    const next=stack.at(-1)||null;
    if(!next&&pendingConfirmation)pendingConfirmation();
    if(!current&&next)returnFocus=document.activeElement;
    panels.forEach(panel=>{panel.inert=panel!==next;panel.setAttribute('aria-hidden',String(panel!==next));if(panel===next)panel.setAttribute('aria-modal','true');else panel.removeAttribute('aria-modal');});
    document.querySelector('.app').inert=Boolean(next);
    if(next===current)return;
    current=next;
    if(next){const focusPanel=()=>{if(current!==next||next.contains(document.activeElement))return;const button=[...next.querySelectorAll(focusable)].find(visible);(button||next).focus({preventScroll:true});};focusPanel();setTimeout(focusPanel,350);}
    else if(returnFocus?.isConnected&&!returnFocus.closest('[inert]'))returnFocus.focus({preventScroll:true});
  }
  const panelObserver=new MutationObserver(sync);
  panels.forEach(panel=>panelObserver.observe(panel,{attributes:true,attributeFilter:['class']}));sync();
  document.addEventListener('keydown',event=>{
    if(!current)return;
    if(pendingConfirmation&&event.key==='Escape'){event.preventDefault();pendingConfirmation();return;}
    if(event.key==='Escape'){event.preventDefault();current.querySelector('.close-sheet,#close-detail,#close-creator')?.click();return;}
    if(event.key!=='Tab')return;
    const items=[...current.querySelectorAll(focusable)].filter(visible),first=items[0],last=items.at(-1);
    if(!first){event.preventDefault();current.focus();return;}
    if(event.shiftKey&&(document.activeElement===first||document.activeElement===current)){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&(document.activeElement===last||!current.contains(document.activeElement))){event.preventDefault();first.focus();}
  });
  let creatorDirty=false;
  new MutationObserver(()=>{if(!document.querySelector('#creator-view.active'))creatorDirty=false;}).observe(document.querySelector('#creator-view'),{attributes:true,attributeFilter:['class']});
  document.querySelector('#creator-view').addEventListener('input',()=>creatorDirty=true);
  document.querySelector('#close-creator').addEventListener('click',async event=>{
    if(window.memoiveCloseWork){event.preventDefault();event.stopImmediatePropagation();if(window.memoiveCloseWork())creatorDirty=false;return;}
    if(!creatorDirty)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(await window.memoiveConfirm('저장하지 않은 변경이 있어요. 닫으면 새로 열 때 사라질 수 있습니다. 닫을까요?')){creatorDirty=false;document.querySelector('#creator-view').classList.remove('active');}
  },true);
})();
