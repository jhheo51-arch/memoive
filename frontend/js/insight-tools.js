(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.InsightTools=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const roles=['기획자','마케터','연구자','일상 기록자'];
  function stamp(record){const text=[record.title,record.bodySavedAt||'',record.sourceBody||record.summary||''].join('|');let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}return text.length+':'+(hash>>>0);}
  function compact(text,limit=160){const value=String(text||'').replace(/\s+/g,' ').trim();if(value.length<=limit)return value;const cut=value.slice(0,limit);const end=cut.lastIndexOf(' ');return cut.slice(0,end>limit*.65?end:limit)+'…';}
  function basic(record,role){
    const body=record.sourceBody||record.summary||'';
    const themes=[
      ['업무 자동화',/자동화|반복 작업|회의록/g],
      ['사용자 경험',/사용자|고객 경험|사용성/g],
      ['학습과 성장',/학습|교육|성장/g],
      ['가설 검증',/실험|가설|검증/g],
      ['브랜드 메시지',/브랜드|마케팅|캠페인/g]
    ].map(([name,re])=>({name,count:(body.match(re)||[]).length})).sort((a,b)=>b.count-a.count);
    const theme=themes[0].count?themes[0].name:'이 영감';
    const questions={
      기획자:`${theme}, 무엇부터 시험할까요?`,
      마케터:`${theme}, 누구에게 어떤 장면으로 전할까요?`,
      연구자:`${theme}, 효과를 어떻게 비교할까요?`,
      '일상 기록자':`${theme}, 내일 무엇을 해볼까요?`
    };
    const sentences=String(record.summary||'').split(/(?<=[.!?。])\s+/);
    return {summary:compact(sentences[0]),question:questions[role]||questions.기획자,context:theme==='이 영감'?'선택한 관점':'본문 키워드 · '+theme};
  }
  function current(record,role){const item=record.aiInsights?.[role];return item?.sourceStamp===stamp(record)?item:null;}
  function validate(value,body){
    if(!value||typeof value.summary!=='string'||!value.summary.trim()||value.summary.length>220||typeof value.question!=='string'||!value.question.trim()||value.question.length>110)throw new Error('AI 응답 형식이 맞지 않아요.');
    if(!Array.isArray(value.evidence)||!value.evidence.length||value.evidence.length>3||value.evidence.some(q=>typeof q!=='string'||q.length<8||q.length>350||!body.includes(q)))throw new Error('AI 근거를 원문에서 확인하지 못했어요.');
    return {summary:value.summary.trim(),question:value.question.trim(),evidence:value.evidence};
  }
  return {roles,stamp,compact,basic,current,validate};
});
