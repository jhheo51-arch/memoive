/* Local-only measurements: no record text or event stream is sent to a server. */
let analysisDays=0,analysisDraftOrigin='unknown';
const analyticsOldTrack=track;
track=function(name,details={}){
  const r=state.records.find(r=>r.id===details.recordId);
  if(name==='record_opened'&&r&&!DataTools.isExample(r)){
    const now=new Date().toISOString();r.analysisFirstOpenedAt ||= now;
    if(r.capturedAt&&Date.now()-Date.parse(r.capturedAt)>=86400000)r.analysisDelayedOpenedAt ||= now;
  }
  analyticsOldTrack(name,details);
};
function measureAi(kind,status,{recordId='',reason=''}={}){track('ai_measure_v1',{recordId,value:JSON.stringify({kind,status,reason})});}
const analysisOriginalRequest=requestAiDraft;
requestAiDraft=async function(payload){
  const included=selectedCreatorRecords().some(r=>!DataTools.isExample(r));
  try{const result=await analysisOriginalRequest(payload);if(included)measureAi('draft','success');analysisDraftOrigin='ai';return {...result,analysisOrigin:'ai'};}
  catch(error){if(included&&!['AI_CANCELLED','AI_NOT_CONNECTED'].includes(error.code))measureAi('draft','failed',{reason:error.name==='AbortError'?'timeout':error.status===429?'limit':'other'});throw error;}
};
const analysisOriginalOpen=openCreator;
openCreator=function(options={}){analysisDraftOrigin=state.outputs.find(o=>o.id===options.outputId)?.draftOrigin||'unknown';return analysisOriginalOpen(options);};
const analysisOriginalApply=applyOutputDraft;
applyOutputDraft=function(result,records,type){analysisDraftOrigin=result.analysisOrigin==='ai'?'ai':'basic';return analysisOriginalApply(result,records,type);};
const analysisOriginalRate=rateSummary;
rateSummary=function(value){
  analysisOriginalRate(value);const r=state.records.find(r=>r.id===state.currentId);if(!r||DataTools.isExample(r))return;
  const ai=InsightTools.current(r,state.role);track('summary_rating_v2',{recordId:r.id,value:JSON.stringify({origin:ai?'ai':'basic',responseId:ai?`${state.role}:${ai.createdAt}`:`basic:${InsightTools.stamp(r)}`,rating:value})});
};
// Existing handlers captured the earlier function; refresh only the rating bindings.
$$('.summary-rating [data-rating]').forEach(button=>button.onclick=()=>rateSummary(button.dataset.rating));
function analysisRate(n,d){return d?`${Math.round(n/d*100)}% · ${n}/${d}개`:'대상 기록 없음';}
function renderInsights(){
  const s=MemoiveAnalytics.summarize(state.records,state.outputs,state.analytics.events,DataTools.isExample,analysisDays);
  const labels={article:'링크·기사',video:'영상',image:'이미지',voice:'음성',text:'텍스트'};
  const row=(label,value,note='')=>`<div class="analysis-row"><div><strong>${label}</strong>${note?`<small>${note}</small>`:''}</div><b>${value}</b></div>`;
  const section=(title,body)=>`<section class="analysis-section"><h2>${title}</h2>${body}</section>`;
  const group=(title,items,action)=>`<details class="analysis-backlog"><summary>${title} <b>${items.length}개</b></summary>${items.length?items.map(r=>`<div class="analysis-record"><span>${esc(r.title)}</span><button type="button" data-analysis-action="${action}" data-id="${esc(r.id)}">${action==='open'?'다시 보기':action==='create'?'결과물 만들기':'활용 남기기'}</button></div>`).join(''):'<p>이 상태에 해당하는 기록이 없어요.</p>'}</details>`;
  const breakdown=items=>items.length?`<ul class="analysis-breakdown">${items.map(g=>`<li><div><strong>${esc(labels[g.label]||g.label)}</strong><span>${g.converted}/${g.total}개 활용 · ${Math.round(g.converted/g.total*100)}%</span></div><meter min="0" max="${g.total}" value="${g.converted}" aria-label="${esc(g.label)} ${g.total}개 중 ${g.converted}개 결과물에 활용"></meter></li>`).join('')}</ul>`:'<p>해당 기간에 저장한 기록이 없어요.</p>';
  const period=analysisDays?`최근 ${analysisDays}일`:'전체 기간';
  const currentRows=[['saved','저장한 기록'],['outputs','새로 저장한 결과물'],['used','활용했다고 남긴 결과물']].map(([key,label])=>row(label,`${s.current[key]}개`,s.previous?`직전 ${analysisDays}일 ${s.previous[key]}개 · ${s.current[key]-s.previous[key]>0?'+':''}${s.current[key]-s.previous[key]}개 변화`:'현재 남아 있는 자료 기준')).join('');
  $('.insights-page').innerHTML=`<header class="page-title"><p class="eyebrow">PRIVATE INSIGHTS</p><h1>내 기록 분석</h1><p>모은 영감이 어디에 쓰였는지 돌아보세요.</p></header>
    <div class="analysis-filters" role="group" aria-label="분석 기간">${[0,7,30].map(d=>`<button type="button" data-analysis-days="${d}" aria-pressed="${d===analysisDays}">${d?`최근 ${d}일`:'전체'}</button>`).join('')}</div>
    <p class="analysis-scope">${period} · 기본 제공 자료 제외 · 이 브라우저의 기록만 집계</p>
    <div class="analysis-headline"><span>결과물에 활용된 기록<strong>${s.conversionRate===null?'—':s.conversionRate+'%'}</strong><small>${s.converted}/${s.selected.length}개 · 선택 기간에 저장한 기록 기준</small></span><span>활용했다고 남긴 결과물<strong>${s.current.used}<em>개</em></strong><small>선택 기간에 활용일을 남긴 자기 보고</small></span></div>
    ${section('기록은 어디까지 이어졌나요?',row('저장한 기록',`${s.selected.length}개`)+row('직접 다시 연 기록',analysisRate(s.opened,s.selected.length))+row('내 생각을 남긴 기록',analysisRate(s.thought,s.selected.length))+row('결과물에 사용한 기록',analysisRate(s.converted,s.selected.length))+'<p class="analysis-help">선택 기간에 저장한 기록의 현재 상태예요. 생각 작성과 다시 보기는 선택 사항이며, 순서대로 거쳐야 하는 단계가 아니에요.</p>')}
    ${section('이어서 활용해 볼까요?',group('아직 다시 열지 않은 기록',s.backlog.unopened,'open')+group('다시 봤지만 결과물에는 쓰지 않은 기록',s.backlog.unused,'create')+group('아직 활용 메모를 남기지 않은 결과물',s.backlog.unconfirmed,'use')+'<p class="analysis-help">이 목록은 기간과 관계없이 현재 남아 있는 모든 내 기록을 살펴봐요. 활용 메모가 없다는 것이 미사용을 의미하지는 않아요.</p>')}
    ${section('기간별 활동',currentRows+'<p class="analysis-help">저장은 저장일, 결과물은 생성일, 활용은 남긴 활용일 기준이에요. 삭제하거나 활용 표시를 취소하면 숫자가 달라져요.</p>')}
    ${section('시간이 지나도 다시 쓰나요?',row('24시간 이상 지나 다시 연 기록',analysisRate(s.delayed,s.eligible),'저장 후 24시간이 지난 기록만 대상')+row('저장 후 7일 안에 결과물에 활용',analysisRate(s.converted7,s.mature),'관찰 기간 7일이 지난 기록만 대상')+`<p class="analysis-help">${s.unknownTime}개는 정확한 저장 시각이 없어 제외했어요. 예전 결과물에 연결된 시각을 알 수 없는 ${s.missingLinkTime}개는 7일 분석에서 제외했어요. 선택 기간에 저장한 기록의 재열람·결과물 연결을 확인하며 고객 재방문율은 아니에요. 오래된 열람 이력이 없으면 실제보다 적게 보일 수 있어요.</p>`)}
    ${section('어떤 자료를 활용했나요?',breakdown(s.types)+'<details><summary>주제별 활용 보기</summary>'+breakdown(s.topics)+'</details><p class="analysis-help">선택 기간에 저장한 기록 중 결과물에 한 번 이상 연결한 비율이에요. 한 기록에 여러 주제가 있으면 각각 포함돼요. 표본이 적으므로 우열이나 효과를 단정하지 않아요.</p>')}
    ${section('AI가 얼마나 도움이 됐나요?',s.ai.map(a=>row(a.kind==='insight'?'본문 AI 정리':'창작 AI 초안·다듬기',a.success+a.failed+a.discarded?`${a.success}건 적용 · ${a.failed}건 실패`:'아직 측정 없음',`완료된 요청 기준 · 내용 변경으로 미적용 ${a.discarded}건 · 시간 초과 ${a.timeouts}건 · 한도 ${a.limited}건`)).join('')+s.ratings.map(r=>row(r.origin==='ai'?'AI 요약 도움 평가':'기본 발췌 도움 평가',r.total?`${Math.round(r.helpful/r.total*100)}% · ${r.helpful}/${r.total}건`:'아직 평가 없음')).join('')+row('이전 방식의 요약 평가',`${s.legacyRatings}개`,'생성 방식 구분 전 평가 · 전체 기록 기준')+s.originOutputs.map(r=>row(`${{ai:'AI',basic:'기본',unknown:'생성 방식 미확인'}[r.origin]} 초안에서 저장한 결과물`,`${r.count}개`)).join('')+'<p class="analysis-help">업데이트 이후 측정해요. 취소·기본 제공 자료만 사용한 요청은 제외하며, 평가한 응답별 마지막 선택을 셉니다. 저장은 AI 덕분의 성과를 뜻하지 않아요. 초안은 직접 수정할 수 있고 예전 결과물은 생성 방식 미확인으로 남겨요.</p>')}
    <details class="analysis-section"><summary>집계 기준과 보관 범위</summary><p>현재 남아 있는 내 기록 ${s.total}개 · 연결된 결과물 ${s.outputCount}개 · 전체 활용 자기 보고 ${s.usedOutputCount}개. 선택 기간의 빠른 복사 ${s.reuse}회.</p><p>기간은 현재부터 7일 또는 30일을 거슬러 계산합니다. 날짜만 남은 예전 기록은 이 기기의 자정 기준으로 기간에 포함하며 시간차 분석에서는 제외해요.</p><p>상세 행동 이력은 최근 2,000개까지만 보관돼요. ${s.capped?'이력 한도에 도달했으므로 과거 집계는 일부만 반영될 수 있어요.':'업데이트 전 유실된 이력은 복원하지 않아요.'} 최초·24시간 후 열람 표시는 이후 기록에 별도 보관해요. 전체 고객 분석이나 자동 게시 확인은 하지 않습니다.</p><p>분석은 기기 안에서만 처리하며 개인 기록이나 분석 이력을 외부 AI로 보내지 않아요.</p></details>
    <a class="study-entry" href="./self-test.html" target="memoive-study" rel="noopener"><strong>기획·검증 노트와 내 사용 테스트</strong><span>문제 가설 · 관찰 근거 · 개선 결정 · 전후 비교 (새 탭)</span></a>`;
  $$('[data-analysis-days]').forEach(b=>b.onclick=()=>{const focus=b.dataset.analysisDays;analysisDays=Number(focus);renderInsights();$(`[data-analysis-days="${focus}"]`).focus();});
  $$('[data-analysis-action]').forEach(b=>b.onclick=()=>{if(b.dataset.analysisAction==='open')openRecord(b.dataset.id);else if(b.dataset.analysisAction==='create')openCreator({recordIds:[b.dataset.id]});else openCreator({outputId:b.dataset.id});});
}
