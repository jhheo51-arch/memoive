(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StudyTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const scenarios = {
    create: { label: '저장에서 결과물까지', task: '실제로 읽은 콘텐츠 하나를 저장하고 내 생각을 적으세요. 상세 화면을 닫은 뒤 검색으로 다시 찾아, 내 관점이 담긴 제안서 한 문단을 수정·저장하세요.', criterion: '검색으로 기록을 찾았고, 참고 내용과 내 의견을 구분한 결과물을 저장한 뒤 다시 열어 확인했다.' },
    recall: { label: '시간을 두고 다시 찾기', task: '앞서 저장한 기록을 최소 30분 뒤 다시 찾아보세요. 제목을 외워 입력하지 말고 기억나는 개념이나 내 생각으로 검색하세요. 당시 생각을 설명하고 결과물에 활용하세요.', criterion: '목표 기록을 찾아 당시 저장 이유를 설명하고, 해당 기록을 연결한 결과물을 저장했다. 실제 간격도 근거에 적는다.' },
    recovery: { label: '읽기 실패 후 이어가기', task: '본문을 읽을 수 없는 링크를 저장했을 때 주소와 메모가 남는지 확인하세요. 직접 확보한 본문을 텍스트로 기록하고 생각을 더해 결과물을 만드세요.', criterion: '실패한 링크의 주소·메모가 남았고, 직접 입력한 텍스트로 결과물을 저장했다. 링크 기록과 텍스트 기록은 별개임을 확인한다.' }
  };
  const methods = { memoive: 'MEMOIVE', baseline: '기존 저장 방식' };
  const outcomes = { success: '도움 없이 완료', assisted: '설명·도움 후 완료', failed: '완료하지 못함', abandoned: '중단' };
  function validate(row) {
    if (!row || typeof row.id !== 'string' || !row.id || !scenarios[row.scenario] || !methods[row.method] || !outcomes[row.outcome]
      || row.participant !== 'maker' || !Number.isFinite(Date.parse(row.startedAt)) || !Number.isFinite(Date.parse(row.endedAt))
      || !Number.isFinite(row.seconds) || row.seconds < 0 || Date.parse(row.endedAt) < Date.parse(row.startedAt)) throw new Error('테스트 기록의 형식이 올바르지 않아요.');
    const text = key => typeof row[key] === 'string' ? row[key].slice(0,4000) : '';
    if (!text('evidence').trim() || !text('friction').trim()) throw new Error('완료 근거와 막힌 점을 남겨주세요.');
    return { id: row.id.slice(0,200), participant:'maker', scenario:row.scenario, method:row.method, outcome:row.outcome,
      startedAt:row.startedAt, endedAt:row.endedAt, seconds:Math.round(row.seconds), evidence:text('evidence'), friction:text('friction'), next:text('next'), device:text('device'), version:text('version'), previousId:text('previousId'), change:text('change'), caseId:text('caseId'), decisionId:text('decisionId'), taskSet:text('taskSet'), frictionStage:text('frictionStage'), frictionReason:text('frictionReason') };
  }
  function parseBackup(value) {
    const data = typeof value === 'string' ? JSON.parse(value) : value;
    if (data?.format !== 'memoive-self-study-v1' || !Array.isArray(data.attempts) || data.attempts.length > 1000) throw new Error('MEMOIVE 사용 테스트 백업이 아니에요.');
    return data.attempts.map(validate);
  }
  function merge(current, incoming) {
    // Existing evidence is never overwritten by an imported record with the same ID.
    return [...new Map([...incoming, ...current].map(row => [row.id, validate(row)])).values()].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));
  }
  function summarize(rows) {
    const keys=[...new Set(rows.map(row=>JSON.stringify([row.scenario,row.method,row.version||'버전 미기록',row.device||'기기 미기록',row.taskSet||'자료 조건 미기록',row.caseId||''])))];
    return keys.map(key => {
      const [scenario,method,version,device,taskSet,caseId]=JSON.parse(key), info=scenarios[scenario], label=methods[method];
      const group=rows.filter(row=>row.scenario===scenario && row.method===method && (row.version||'버전 미기록')===version&&(row.device||'기기 미기록')===device&&(row.taskSet||'자료 조건 미기록')===taskSet&&(row.caseId||'')===caseId), done=group.filter(row=>row.outcome==='success');
      const times=done.map(row=>row.seconds).sort((a,b)=>a-b), middle=Math.floor(times.length/2);
      return { label:`${info.label} · ${label} · ${version} · ${device} · ${taskSet}`, attempts:group.length, successes:done.length,
        median:times.length ? (times.length%2 ? times[middle] : (times[middle-1]+times[middle])/2) : null };
    });
  }
  function csv(rows) {
    const keys=['id','startedAt','scenario','method','outcome','seconds','evidence','friction','next','device','version','previousId','change','caseId','decisionId','taskSet','frictionStage','frictionReason'];
    const cell=value=>'"'+String(value??'').replace(/^[\s]*[=+@-]/, value=>"'"+value).replace(/"/g,'""')+'"';
    return '\uFEFF'+[keys,...rows.map(row=>keys.map(key=>row[key]))].map(row=>row.map(cell).join(',')).join('\r\n');
  }
  return { scenarios, methods, outcomes, validate, parseBackup, merge, summarize, csv };
});
