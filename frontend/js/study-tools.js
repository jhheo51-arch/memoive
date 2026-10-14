(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.StudyTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  const scenarios = {
    create: { label: '저장에서 결과물까지', task: '실제로 읽은 콘텐츠 하나를 저장하고 내 생각을 적으세요. 상세 화면을 닫은 뒤 검색으로 다시 찾아, 내 관점이 담긴 제안서 한 문단을 수정·저장하세요.', criterion: '검색으로 기록을 찾았고, 참고 내용과 내 의견을 구분한 결과물을 저장한 뒤 다시 열어 확인했다.' },
    recall: { label: '시간을 두고 다시 찾기', task: '앞서 저장한 기록을 최소 30분 뒤 다시 찾아보세요. 제목을 외워 입력하지 말고 기억나는 개념이나 내 생각으로 검색하세요. 당시 생각을 설명하고 결과물에 활용하세요.', criterion: '목표 기록을 찾아 당시 저장 이유를 설명하고, 해당 기록을 연결한 결과물을 저장했다. 실제 간격도 근거에 적는다.' },
    recovery: { label: '읽기 실패 후 이어가기', task: '본문을 읽을 수 없는 링크를 저장했을 때 주소와 메모가 남는지 확인하세요. 직접 확보한 본문을 텍스트로 기록하고 생각을 더해 결과물을 만드세요.', criterion: '실패한 링크의 주소·메모가 남았고, 직접 입력한 텍스트로 결과물을 저장했다. 링크 기록과 텍스트 기록은 별개임을 확인한다.' },
    // v2.0 tasks (PRD 9.2): compare the same task before and after a change.
    related: { label: 'v2 · 연관 기록 이유 설명', task: '생각을 남긴 기록 하나를 열고, 함께 보면 이어지는 기록 중 하나를 고르세요. 화면에 보이는 정보만으로 왜 연결됐는지 한 문장으로 설명하세요.', criterion: '화면의 근거(겹친 생각·주제·단어)를 인용해 연결 이유를 설명했고, 고른 기록을 열어 실제로 이어지는지 판단을 적었다.' },
    perspective: { label: 'v2 · 내 관점으로 기록', task: '설정에서 내 상황에 맞는 관점을 만들고 템플릿 소제목을 정하세요. 그 관점으로 새 자료 하나에 생각을 남기세요.', criterion: '직접 만든 관점과 템플릿으로 생각을 저장했고, 기록 상세에서 그 관점 이름으로 보이는 것을 확인했다.' },
    question: { label: 'v2 · 질문 받고 생각 남기기', task: '새 자료를 저장하고 질문 받기를 눌러 질문에 답하며 생각을 남기세요. 필요하면 한 번 더 질문을 받으세요.', criterion: '질문 1개 이상에 직접 답했고, 답이 내 생각으로 저장된 것을 기록 상세에서 확인했다. 받은 질문 수와 AI·기본 질문 여부를 근거에 적는다.' },
    followup: { label: 'v2 · 예전 생각에 덧붙이기', task: '며칠 이상 지난 기록을 열어, 이전 생각을 바꾸지 않고 오늘의 생각을 덧붙이세요.', criterion: '덧붙인 생각이 날짜와 함께 생각의 흐름에 보이고, 이전 생각은 그대로임을 확인했다. 저장일과의 간격을 근거에 적는다.' },
    principle: { label: 'v2 · 기록에서 원칙 만들기', task: '생각을 남긴 기록 두 개 이상을 골라 내가 일할 때 쓸 원칙 한 문장을 만드세요.', criterion: '근거 기록 2개 이상이 연결된 원칙을 저장했고, 원칙 문장을 직접 썼다. 원칙을 실제로 적용했다면 그 상황을 근거에 적는다.' }
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
