(function(){
  const TOKEN_KEY='memoive-owner-sync-token',ETAG_KEY='memoive-owner-sync-etag',ENDPOINT=window.MEMOIVE_SYNC_ENDPOINT||'/api/sync',ORIGINAL_ENDPOINT=window.MEMOIVE_ORIGINAL_ENDPOINT||'/api/original';
  let token='',etag='',timer=0,saving=false,pending=false,connected=false;
  const localPersist=persist;
  const status=()=>document.querySelector('#cloud-sync-status');
  const button=()=>document.querySelector('#cloud-sync-connect');
  const copyButton=()=>document.querySelector('#cloud-sync-copy');
  const input=()=>document.querySelector('#cloud-sync-code');
  const setStatus=(message,stateName='')=>{const el=status();if(!el)return;el.textContent=message;el.dataset.state=stateName;};
  const cloudState=()=>({...persistentState(),workspaces:state.workspaces||[],syncedAt:new Date().toISOString()});

  function installUi(){
    const summary=document.querySelector('#data-vault-sheet .vault-summary');
    if(!summary||document.querySelector('#cloud-sync-connect'))return;
    const card=document.createElement('section');
    card.className='cloud-sync-card';card.setAttribute('aria-labelledby','cloud-sync-title');
    card.innerHTML='<div><strong id="cloud-sync-title">Supabase 클라우드 저장</strong><p id="cloud-sync-status" role="status" aria-live="polite">연결 상태를 확인하고 있어요.</p></div><label for="cloud-sync-code">내 기기 연결 코드<input id="cloud-sync-code" type="password" autocomplete="off" spellcheck="false" placeholder="연결 코드를 입력하세요"></label><button class="secondary solid" id="cloud-sync-copy" type="button" hidden>다른 기기 연결 링크 복사</button><button class="secondary solid" id="cloud-sync-connect" type="button">Supabase에 연결</button>';
    summary.before(card);
    const copy=document.querySelector('#data-vault-sheet .sheet-copy');
    if(copy)copy.textContent='연결하면 기록·결과물과 이미지·음성 원본을 비공개 Supabase 저장소에 보관해요. 이 기기의 기존 기록은 지우지 않고 첫 연결 때 자동으로 옮깁니다.';
  }

  function rememberLocal(){try{localStorage.setItem(`memoive-before-supabase-${Date.now()}`,JSON.stringify(persistentState()))}catch{}}

  function renderConnection(){
    if(!button())return;
    button().textContent=connected?'이 기기 연결 해제':'Supabase에 연결';
    copyButton().hidden=!connected;
    input().hidden=connected;
    input().value='';
  }

  function applyCloud(data){
    const clean=DataTools.validateBackup(data);
    rememberLocal();
    state.records=syncSiteDemoRecords(DataTools.withExamples(clean.records,CaseStudies.records.filter(record=>!clean.dismissedExampleIds.includes(record.id))),clean.dismissedExampleIds);
    state.dismissedExampleIds=clean.dismissedExampleIds;
    state.outputs=DataTools.cleanOutputs(clean.outputs);
    state.analytics=DataTools.cleanAnalytics(clean.analytics);
    state.role=clean.role||state.role;
    state.resurface=clean.resurface;
    state.reminderFrequency=clean.reminderFrequency;
    state.reminderTime=clean.reminderTime;
    state.workspaces=Array.isArray(data.workspaces)?data.workspaces:[];
    localPersist();
    renderAll();
    renderVault();
  }

  async function request(method,body){
    const headers={Authorization:`Bearer ${token}`};
    if(body){headers['Content-Type']='application/json';if(etag)headers['If-Match']=etag;}
    const response=await fetch(ENDPOINT,{method,headers,body:body?JSON.stringify(body):undefined,cache:'no-store'});
    const data=await response.json().catch(()=>({message:'서버 응답을 읽지 못했어요.'}));
    if(!response.ok){const error=new Error(data.message||'동기화 요청에 실패했어요.');error.status=response.status;throw error;}
    if(data.syncEtag){etag=data.syncEtag;localStorage.setItem(ETAG_KEY,etag);}
    return data;
  }

  async function originalRequest(action,id,extra={}){
    if(!connected||!token)throw new Error('Supabase 연결이 필요해요.');
    const response=await fetch(ORIGINAL_ENDPOINT,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({action,id,...extra}),cache:'no-store'});
    const data=await response.json().catch(()=>({message:'원본 저장소 응답을 읽지 못했어요.'}));
    if(!response.ok){const error=new Error(data.message||'원본 저장소를 사용할 수 없어요.');error.status=response.status;throw error;}
    return data;
  }

  async function uploadOriginal(id,blob){
    if(!connected)return false;
    const {signedUrl}=await originalRequest('upload',id,{contentType:blob.type,size:blob.size});
    const response=await fetch(signedUrl,{method:'PUT',headers:{'Content-Type':blob.type,'x-upsert':'true'},body:blob});
    if(!response.ok)throw new Error('이미지·음성 원본을 Supabase에 저장하지 못했어요.');
    return true;
  }

  async function downloadOriginal(id){
    if(!connected)return null;
    try{
      const {signedUrl}=await originalRequest('download',id);
      const response=await fetch(signedUrl,{cache:'no-store'});
      if(!response.ok)throw new Error('원본을 내려받지 못했어요.');
      return await response.blob();
    }catch(error){if(error.status===404)return null;throw error;}
  }

  async function deleteOriginal(id){
    if(!connected)return false;
    await originalRequest('delete',id);
    return true;
  }

  window.MemoiveCloudOriginals={
    connected:()=>connected,
    put:uploadOriginal,
    get:downloadOriginal,
    delete:deleteOriginal
  };

  async function migrateOriginals(){
    if(typeof OriginalStore==='undefined')return;
    const media=state.records.filter(record=>record.type==='image'||record.type==='voice');
    let moved=0;
    for(const record of media){
      const blob=await OriginalStore.getLocal(record.id).catch(()=>null);
      if(!blob)continue;
      await uploadOriginal(record.id,blob);
      moved+=1;
    }
    if(moved)setStatus(`기록 ${state.records.length}개와 원본 ${moved}개를 Supabase에 저장했어요.`,'ok');
  }

  async function loadCloud(){
    setStatus('Supabase 기록을 확인하고 있어요.','busy');
    const data=await request('GET');
    applyCloud(data);
    connected=true;renderConnection();
    setStatus(`Supabase 기록 ${state.records.length}개를 불러왔어요.`,'ok');
    void migrateOriginals().catch(()=>setStatus('기록은 저장됐지만 일부 이미지·음성 원본은 이 기기에만 남아 있어요.','error'));
  }

  async function saveCloud({throwOnError=false}={}){
    if(!connected||saving)return;
    saving=true;pending=false;setStatus('Supabase에 변경 내용을 저장하고 있어요.','busy');
    try{const result=await request('PUT',cloudState());setStatus(`기록 ${result.records}개 · Supabase 저장 완료`,'ok');}
    catch(error){
      setStatus(error.message,'error');
      if(error.status===401){connected=false;localStorage.removeItem(TOKEN_KEY);renderConnection();}
      if(throwOnError)throw error;
    }finally{saving=false;if(pending)queueCloudSync();}
  }

  window.queueCloudSync=function(){
    if(!connected)return;
    pending=true;clearTimeout(timer);timer=setTimeout(saveCloud,900);
  };
  persist=function(){localPersist();queueCloudSync();};

  async function firstSupabaseSave(){
    rememberLocal();
    connected=true;etag='';localStorage.removeItem(ETAG_KEY);renderConnection();
    setStatus('이 기기의 기존 기록을 Supabase로 옮기고 있어요.','busy');
    await saveCloud({throwOnError:true});
    await migrateOriginals();
  }

  async function connect(){
    if(connected){
      connected=false;token='';etag='';localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(ETAG_KEY);
      setStatus('이 브라우저의 연결만 해제했어요. 기기 기록과 Supabase 기록은 그대로예요.','');renderConnection();return;
    }
    const value=input().value.trim();
    if(value.length<20)return setStatus('내 기기 연결 코드를 정확히 입력해 주세요.','error');
    token=value;etag=localStorage.getItem(ETAG_KEY)||'';
    try{
      await loadCloud();
      localStorage.setItem(TOKEN_KEY,token);
    }catch(error){
      if(error.status===404){await firstSupabaseSave();localStorage.setItem(TOKEN_KEY,token);return;}
      token='';etag='';setStatus(error.message,'error');renderConnection();
    }
  }

  function readOwnerLink(){
    const hash=new URLSearchParams(location.hash.slice(1)),value=hash.get('sync');
    if(value){token=value;localStorage.setItem(TOKEN_KEY,value);history.replaceState({},'',location.pathname+location.search);}
  }

  async function copyOwnerLink(){
    if(!connected||!token)return;
    const url=`${location.origin}${location.pathname}#sync=${encodeURIComponent(token)}`;
    try{await navigator.clipboard.writeText(url);setStatus('다른 기기에서 열 연결 링크를 복사했어요. 연결 뒤 주소에서는 코드가 자동으로 지워져요.','ok');}
    catch{setStatus('연결 링크를 복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요.','error');}
  }

  async function restoreConnection(){
    try{await loadCloud();}
    catch(error){
      if(error.status===404){await firstSupabaseSave();return;}
      setStatus(error.message,'error');connected=false;renderConnection();
    }
  }

  function init(){
    installUi();
    readOwnerLink();token=token||localStorage.getItem(TOKEN_KEY)||'';etag=localStorage.getItem(ETAG_KEY)||'';
    button().onclick=connect;
    copyButton().onclick=copyOwnerLink;
    input().addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();connect();}});
    if(token)void restoreConnection();
    else{setStatus('연결 전 · 기록은 이 브라우저에만 저장돼요.','');renderConnection();}
  }
  init();
})();
