/* Media is cached locally and, when connected, copied to the private Supabase bucket. Never sent to Gemini. */
const OriginalStore=(()=>{
  let db;
  const open=()=>db||(db=new Promise((resolve,reject)=>{const r=indexedDB.open('memoive-originals',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);}));
  async function run(mode,id,blob){const database=await open();return new Promise((resolve,reject)=>{const tx=database.transaction('files',mode),store=tx.objectStore('files'),r=mode==='readonly'?store.get(id):blob===undefined?store.delete(id):store.put(blob,id);tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});}
  const getLocal=id=>run('readonly',id);
  return {
    getLocal,
    async get(id){const local=await getLocal(id);if(local)return local;const cloud=await window.MemoiveCloudOriginals?.get(id);if(cloud){await run('readwrite',id,cloud);return cloud}return null},
    async delete(id){await run('readwrite',id);if(window.MemoiveCloudOriginals?.connected())await window.MemoiveCloudOriginals.delete(id)},
    async put(id,blob){if(!(/^image\/(png|jpeg|gif|webp|avif)$/.test(blob.type)||/^audio\//.test(blob.type)))throw Error('PNG·JPG·GIF·WebP·AVIF 이미지 또는 음성 파일을 선택해 주세요.');await run('readwrite',id,blob);if(window.MemoiveCloudOriginals?.connected())await window.MemoiveCloudOriginals.put(id,blob)}
  };
})();
let originalUrl='',originalRender=0;
const previousSourceRenderer=renderSourceBody;
renderSourceBody=function(record){
  previousSourceRenderer(record);
  // Keep source repair available in the existing recovery menu, without the status card.
  const repair=$('.insight-options');if(repair)repair.append($('#source-paste-details'));
  $('#saved-source').hidden=true;
  $('#saved-source-details').hidden=true;
  let host=$('#record-original');
  if(!host){host=document.createElement('section');host.id='record-original';host.className='record-original';$('#saved-source').after(host);}
  const ticket=++originalRender;
  if(originalUrl){URL.revokeObjectURL(originalUrl);originalUrl='';}
  host.replaceChildren();
  if(['image','voice'].includes(record.type)){const heading=document.createElement('h3');heading.textContent='원본 보기';host.append(heading);}
  const link=(url,label)=>{const a=document.createElement('a');a.href=url;a.textContent=label;a.target='_blank';a.rel='noopener noreferrer';host.append(a);return a;};
  if(!['image','voice'].includes(record.type)){
    if(record.url){link(record.url,record.type==='video'?'영상 원본 열기':'원문 링크 열기');$('#source-link').style.display='none';}
    else if(record.sourceBody){originalUrl=URL.createObjectURL(new Blob([record.sourceBody],{type:'text/plain;charset=utf-8'}));link(originalUrl,'작성한 글 원문 열기');}
    else{const p=document.createElement('p');p.textContent='저장된 원문 링크나 본문이 없어요.';host.append(p);}
    return;
  }
  const status=document.createElement('p');status.textContent='원본 확인 중…';host.append(status);
  const label=document.createElement('label');label.textContent=record.type==='voice'?'음성 원본 첨부':'이미지 원본 첨부';
  const file=document.createElement('input');file.type='file';file.accept=record.type==='voice'?'audio/*':'image/*';label.append(file);host.append(label);
  const note=document.createElement('small');note.textContent=window.MemoiveCloudOriginals?.connected()?'원본은 이 기기와 비공개 Supabase 저장소에 함께 보관돼요.':'연결 전에는 원본이 이 브라우저에만 보관돼요. 기록 보관함에서 Supabase를 연결해 주세요.';host.append(note);
  const show=blob=>{if(ticket!==originalRender)return;if(!blob){status.textContent='이 기록에는 원본 파일이 저장되지 않았어요. 파일을 첨부하면 다시 열 수 있어요.';return;}status.textContent='저장한 원본';originalUrl=URL.createObjectURL(blob);if(record.type==='voice'){const audio=document.createElement('audio');audio.controls=true;audio.src=originalUrl;host.insertBefore(audio,label);}else link(originalUrl,'이미지 원본 열기');};
  OriginalStore.get(record.id).then(show).catch(()=>{status.textContent='원본 저장 공간을 열지 못했어요. 브라우저 설정을 확인해 주세요.';});
  file.onchange=async()=>{const blob=file.files[0];if(!blob)return;if(!blob.type.startsWith(record.type==='voice'?'audio/':'image/')||blob.size>25*1024*1024){status.textContent='형식에 맞는 25MB 이하 파일을 선택해 주세요.';return;}try{await OriginalStore.put(record.id,blob);if(ticket===originalRender)renderSourceBody(record);}catch{status.textContent='원본을 저장하지 못했어요. 선택한 파일은 그대로 두고 저장 공간을 확인해 주세요.';}};
};
