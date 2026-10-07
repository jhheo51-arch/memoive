/* Protect the existing device-local store; this is not cloud sync. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.StorageGuard=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function create(getStorage,key,snapshotKey){
    let expected=null,blocked='',loaded=false;
    const fail=message=>{const error=new Error(message);error.name='StorageSafetyError';return error;};
    const parse=raw=>{const value=JSON.parse(raw);if(!value||!Array.isArray(value.records)||value.records.some(r=>!r||typeof r.id!=='string'||typeof r.title!=='string'||!Array.isArray(r.topics)))throw Error('Invalid records');if(value.outputs!==undefined&&!Array.isArray(value.outputs))throw Error('Invalid outputs');return value;};
    function read(){
      loaded=true;
      try{
        const storage=getStorage();expected=storage.getItem(key);
        if(expected!==null){try{return parse(expected);}catch{blocked='저장된 자료 일부를 읽지 못했어요. 덮어쓰기를 중단했습니다. 읽을 수 있는 기록을 백업해 다른 브라우저에서 복원해 주세요.';}}
        const snapshot=storage.getItem(snapshotKey);
        if(snapshot!==null){try{const recovered=parse(snapshot);blocked=blocked||'기본 저장본이 없어 이전 보관본을 열었어요. 먼저 백업한 뒤 다른 브라우저에서 복원해 주세요.';return recovered;}catch{blocked=blocked||'저장본을 읽지 못해 덮어쓰기를 중단했어요. 기존 백업 파일을 다른 브라우저에서 복원해 주세요.';}}
      }catch{blocked='브라우저가 저장 공간 접근을 막았어요. 설정을 확인해 주세요. 기존 자료는 덮어쓰지 않습니다.';}
      return null;
    }
    function commit(value){
      if(!loaded)read();
      if(blocked)throw fail(blocked);
      try{
        const storage=getStorage(),current=storage.getItem(key);
        if(current!==expected)throw fail('다른 탭에서 기록이 바뀌었어요. 입력한 글을 복사한 뒤 새로고침해 주세요. 이 탭의 변경은 저장하지 않았습니다.');
        const next=JSON.stringify(value);
        storage.setItem(key,next);expected=next;
        // A failed optional snapshot must never prevent a successful main save.
        if(current!==null){try{storage.setItem(snapshotKey,current);}catch{}}
      }catch(error){if(error.name==='StorageSafetyError')throw error;throw fail('저장 공간이 부족하거나 차단돼 저장하지 못했어요. 입력은 남겨두었습니다. 기존 기록을 백업하고 브라우저 저장 설정을 확인해 주세요.');}
    }
    return {read,commit,get warning(){return blocked;}};
  }
  return {create};
});
