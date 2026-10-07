(function(){
  const TOKEN_KEY='memoive-owner-sync-token',ETAG_KEY='memoive-owner-sync-etag',ENDPOINT='/api/sync';
  let token='',etag='',timer=0,saving=false,pending=false,connected=false;
  const localPersist=persist;
  const status=()=>document.querySelector('#cloud-sync-status');
  const button=()=>document.querySelector('#cloud-sync-connect');
  const input=()=>document.querySelector('#cloud-sync-code');
  const setStatus=(message,stateName='')=>{const el=status();if(!el)return;el.textContent=message;el.dataset.state=stateName;};
  const cloudState=()=>({...persistentState(),workspaces:state.workspaces||[],syncedAt:new Date().toISOString()});
  function installUi(){
    const summary=document.querySelector('#data-vault-sheet .vault-summary');
    if(!summary||document.querySelector('#cloud-sync-connect'))return;
    const card=document.createElement('section');
    card.className='cloud-sync-card';card.setAttribute('aria-labelledby','cloud-sync-title');
    card.innerHTML='<div><strong id="cloud-sync-title">하나의 저장소</strong><p id="cloud-sync-status" role="status" aria-live="polite">연결 상태를 확인하고 있어요.</p></div><label for="cloud-sync-code">소유자 연결 코드<input id="cloud-sync-code" type="password" autocomplete="off" spellcheck="false" placeholder="연결 코드를 입력하세요"></label><button class="secondary solid" id="cloud-sync-connect" type="button">하나의 저장소에 연결</button>';
    summary.before(card);
    const copy=document.querySelector('#data-vault-sheet .sheet-copy');
    if(copy)copy.textContent='연결하면 이 주소에서 추가·수정한 기록을 하나의 비공개 저장소에 보관해요. 연결 전 기록도 자동 백업한 뒤 클라우드 기록으로 맞춥니다.';
  }
  function rememberLocal(){try{localStorage.setItem(`memoive-before-cloud-${Date.now()}`,JSON.stringify(persistentState()))}catch{}}
  function renderConnection(){
    if(!button())return;
    button().textContent=connected?'연결 해제':'하나의 저장소에 연결';
    input().hidden=connected;
    input().value='';
    if(connected&&!status().textContent)setStatus('클라우드 저장소와 연결됐어요.','ok');
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
  async function loadCloud(){
    setStatus('클라우드 기록을 확인하고 있어요.','busy');
    const data=await request('GET');
    applyCloud(data);
    connected=true;renderConnection();setStatus(`클라우드 기록 ${state.records.length}개를 불러왔어요.`,'ok');
  }
  async function saveCloud(){
    if(!connected||saving)return;
    saving=true;pending=false;setStatus('변경 내용을 저장하고 있어요.','busy');
    try{const result=await request('PUT',cloudState());setStatus(`기록 ${result.records}개 · 클라우드 저장 완료`,'ok');}
    catch(error){setStatus(error.message,'error');if(error.status===401){connected=false;localStorage.removeItem(TOKEN_KEY);renderConnection();}}
    finally{saving=false;if(pending)queueCloudSync();}
  }
  window.queueCloudSync=function(){
    if(!connected)return;
    pending=true;clearTimeout(timer);timer=setTimeout(saveCloud,1200);
  };
  persist=function(){localPersist();queueCloudSync();};
  async function connect(){
    if(connected){connected=false;token='';etag='';localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(ETAG_KEY);setStatus('이 브라우저의 연결만 해제했어요. 기기 기록은 그대로예요.','');renderConnection();return;}
    const value=input().value.trim();
    if(value.length<20)return setStatus('소유자 연결 코드를 정확히 입력해 주세요.','error');
    token=value;etag=localStorage.getItem(ETAG_KEY)||'';
    try{await loadCloud();localStorage.setItem(TOKEN_KEY,token);}
    catch(error){token='';etag='';setStatus(error.message,'error');renderConnection();}
  }
  function readOwnerLink(){
    const hash=new URLSearchParams(location.hash.slice(1)),value=hash.get('sync');
    if(value){token=value;localStorage.setItem(TOKEN_KEY,value);history.replaceState({},'',location.pathname+location.search);}
  }
  function init(){
    installUi();
    readOwnerLink();token=token||localStorage.getItem(TOKEN_KEY)||'';etag=localStorage.getItem(ETAG_KEY)||'';
    button().onclick=connect;
    input().addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();connect();}});
    if(token)loadCloud().catch(error=>{setStatus(error.message,'error');connected=false;renderConnection();});else{setStatus('연결 전 · 기록은 이 브라우저에만 저장돼요.','');renderConnection();}
  }
  init();
})();
