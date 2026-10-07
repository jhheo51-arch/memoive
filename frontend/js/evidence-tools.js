(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.EvidenceTools=api;})(globalThis,function(){
  const kinds=['self','interview','observation'];
  const stages={unknown:'미분류',none:'막힘 없음',save:'저장·본문 확보',find:'다시 찾기',think:'생각 남기기',create:'결과물 만들기',use:'실제 활용'};
  const reasons={unknown:'미확인',none:'막힘 없음',not_needed:'아직 필요하지 않음',findability:'찾기 어려움',unclear:'다음 행동 불명확',quality:'정리·초안 아쉬움',technical:'기술 오류',elsewhere:'다른 곳에서 활용',other:'기타'};
  function validate(data){
    if(data?.format!=='memoive-evidence-v1')throw Error('기획 근거 백업 형식이 아니에요.');
    const result={format:data.format};
    for(const key of ['cases','observations','decisions']){
      if(!Array.isArray(data[key])||data[key].length>1000)throw Error('기획 근거 목록을 확인해 주세요.');
      const ids=new Set();result[key]=data[key].map(r=>{
        if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||!Number.isFinite(Date.parse(r.at)))throw Error('중복 ID 또는 날짜가 잘못된 근거예요.');ids.add(r.id);
        const required=key==='cases'?['title','target','hypothesis','metric','criterion','guardrail']:key==='observations'?['caseId','kind','participant','behavior','interpretation','alternative','direction']:['caseId','change','alternative','rationale','version'];
        for(const field of required)if(typeof r[field]!=='string'||!r[field].trim()||r[field].length>4000)throw Error('필수 내용이나 입력 길이를 확인해 주세요.');
        if(key==='observations'&&(!kinds.includes(r.kind)||!['support','counter','unclear'].includes(r.direction)))throw Error('관찰 분류를 확인해 주세요.');
        if(key==='decisions'&&(!Array.isArray(r.evidenceIds)||!r.evidenceIds.length||r.evidenceIds.some(x=>typeof x!=='string')))throw Error('개선 결정을 뒷받침하는 관찰을 선택해 주세요.');
        return Object.fromEntries(['id','at',...required,...(key==='decisions'?['evidenceIds']:[])].map(k=>[k,r[k]]));
      });
    }
    for(const r of [...result.observations,...result.decisions])if(!result.cases.some(c=>c.id===r.caseId))throw Error('연결한 문제 가설이 없어요.');
    for(const d of result.decisions)if(d.evidenceIds.some(id=>!result.observations.some(o=>o.id===id&&o.caseId===d.caseId)))throw Error('개선 결정의 근거 연결이 맞지 않아요.');
    return result;
  }
  function merge(current,incoming){validate(incoming);const result={format:'memoive-evidence-v1'};for(const key of ['cases','observations','decisions'])result[key]=[...new Map([...incoming[key],...current[key]].map(r=>[r.id,r])).values()];return validate(result);}
  function compare(row,rows){
    const before=rows.find(r=>r.id===row.previousId),reasons=[];
    if(!before)return {comparable:false,reasons:['연결한 이전 시험이 없어요.'],delta:null};
    for(const [key,label] of [['scenario','과제'],['method','사용 방식'],['device','기기'],['taskSet','자료 난이도·조건 묶음'],['caseId','문제 가설']])if(!row[key]||row[key]!==before[key])reasons.push(`${label}이 같거나 기록되어 있지 않아요.`);
    if(!row.change?.trim())reasons.push('실제 변경 내용을 남겨야 해요.');
    if(Date.parse(row.startedAt)<Date.parse(before.endedAt))reasons.push('이전 시험이 끝난 뒤의 재시험이 아니에요.');
    const bothSuccess=row.outcome==='success'&&before.outcome==='success';
    return{before,comparable:!reasons.length,reasons,delta:!reasons.length&&bothSuccess?row.seconds-before.seconds:null};
  }
  function report(data,rows){
    const text=['# MEMOIVE 기획·검증 기록','', '작성한 관찰과 제작자 사용 테스트를 연결한 기록입니다. 수요·인과 효과·고객 대표성의 검증 완료를 뜻하지 않습니다.',''];
    for(const c of data.cases){
      const observations=data.observations.filter(o=>o.caseId===c.id),decisions=data.decisions.filter(d=>d.caseId===c.id),runs=rows.filter(r=>r.caseId===c.id);
      text.push(`## ${c.title}`,`- 대상: ${c.target}`,`- 가설: ${c.hypothesis}`,`- 주 지표: ${c.metric}`,`- 작성한 판정 기준: ${c.criterion}`,`- 함께 지킬 조건: ${c.guardrail}`,`- 가설 작성일: ${c.at}`,`- 수요 상태: ${observations.some(o=>o.kind!=='self')?'외부 관찰 기록 있음 · 대표성/수요 확정 불가':'외부 대상 사용자 근거 미확보'}`,'');
      for(const o of observations)text.push(`### 관찰 ${o.id}`,`- 방식/대상/일자: ${o.kind} / ${o.participant} / ${o.at}`,`- 실제 행동·발언: ${o.behavior}`,`- 작성자의 해석: ${o.interpretation}`,`- 현재 쓰는 대안: ${o.alternative}`,`- 가설과의 관계: ${o.direction}`,'');
      for(const d of decisions)text.push(`### 개선 결정 ${d.id}`,`- 연결한 관찰: ${d.evidenceIds.join(', ')}`,`- 바꿀 내용: ${d.change}`,`- 제외한 대안: ${d.alternative}`,`- 선택 이유: ${d.rationale}`,`- 적용할 버전: ${d.version}`,'');
      text.push(`### 제작자 사용 시험 ${runs.length}회 · ${runs.length?1:0}명`);
      for(const r of runs){const comparison=compare(r,rows);text.push(`- 시험 ${r.id}: ${r.version} / ${r.outcome} / ${r.seconds}초`,`  - 완료 근거: ${r.evidence}`,`  - 막힘: ${stages[r.frictionStage]||'미분류'} / ${reasons[r.frictionReason]||'미분류'} / ${r.friction}`,`  - 개선 결정 연결: ${r.decisionId||'없음'}`);if(r.previousId)text.push(`  - 전후 비교: ${comparison.comparable?'조건 일치 · 인과 효과 미확정':comparison.reasons.join(' ')}`,`  - 도움 없이 완료한 두 시험의 시간 차이: ${comparison.delta===null?'비교하지 않음':comparison.delta+'초 (이후−이전)'}`);}
      text.push('','학습효과·표본 수·과제 난이도 차이를 확인해야 합니다. 성공·실패를 모두 보존하고, 가설과 다른 관찰도 제외하지 않습니다.','');
    }
    return text.join('\n');
  }
  return{validate,merge,compare,report,stages,reasons};
});
