(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MemoiveContract=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const VERSION=2;
  const analysisRules='자료 정보 → 핵심 요약 → 주요 근거 → 해석과 한계 → 나에게 남길 질문 → 다시 쓸 방법 순서로 분석한다. 요약은 주제별로 깔끔하고 간결한 문장으로 쓴다. facts.kind는 source_fact(자료에서 관찰 가능한 사실) 또는 author_claim(작성자의 평가·주장·효과·인과 해석)이다. 자료에 있다는 이유만으로 외부 검증 사실이라 하지 않는다. interpretation은 AI 해석, action은 새로운 창작 제안이다. 근거 quote는 본문 그대로 인용한다. 확인하지 못한 내용을 채우지 않고 unknowns에 남긴다. 사용자 경험과 생각은 만들지 않고 질문한다. keywords는 다시 찾을 검색어 2~5개, useCase는 활용 가능한 구체적 상황 하나이다. 제목·날짜·출처는 클라이언트의 확인된 자료 정보로 표시하므로 임의로 생성하지 않는다.';
  const str={type:'string'};
  const schema={type:'object',properties:{
    summary:str,question:str,
    facts:{type:'array',items:{type:'object',properties:{claim:str,quote:str,kind:{type:'string',enum:['source_fact','author_claim']}},required:['claim','quote','kind']}},
    interpretation:{type:'object',properties:{connection:str,difference:str},required:['connection','difference']},
    action:{type:'object',properties:{task:str,deliverable:str,check:str},required:['task','deliverable','check']},
    unknowns:{type:'array',items:str},clarification:str,keywords:{type:'array',items:str},useCase:str
  },required:['summary','question','facts','interpretation','action','unknowns','clarification','keywords','useCase']};
  function bounded(value,max){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
  function context(value={}){
    const result={};
    for(const key of ['thought','concern','output']){
      if(value[key]===undefined)continue;
      if(typeof value[key]!=='string'||value[key].length>1000)throw Error('맥락은 항목마다 1,000자 이내로 입력해 주세요.');
      if(value[key].trim())result[key]=value[key].trim();
    }
    return result;
  }
  function validate(v,body){
    if(!v||!bounded(v.summary,220)||!bounded(v.question,160)||!Array.isArray(v.facts)||v.facts.length<1)throw Error('AI 응답 구조를 확인하지 못했어요.');
    const facts=v.facts.map(f=>{
      if(!bounded(f?.claim,300)||!bounded(f?.quote,240)||f.quote.length<8||!body.includes(f.quote))throw Error('AI가 제시한 근거를 원문에서 찾지 못했어요.');
      const numbers=f.claim.match(/\d+(?:[.,]\d+)*(?:%|배|명|회|원|일|시간|분)?/g)||[];
      if(numbers.some(n=>!body.includes(n)))throw Error('원문에 없는 수치를 발견해 응답을 적용하지 않았어요.');
      if(f.kind!==undefined&&!['source_fact','author_claim'].includes(f.kind))throw Error('근거의 성격을 확인하지 못했어요.');
      return {claim:f.claim.trim(),quote:f.quote,kind:f.kind||'unclassified'};
    });
    if(!bounded(v.interpretation?.connection,400)||!bounded(v.interpretation?.difference,300)||!bounded(v.action?.task,320)||!bounded(v.action?.deliverable,200)||!bounded(v.action?.check,320)||!Array.isArray(v.unknowns)||v.unknowns.length<1||v.unknowns.length>3||v.unknowns.some(x=>!bounded(x,240))||!bounded(v.clarification,180))throw Error('적용 방법과 한계가 완성되지 않았어요.');
    const enriched=Array.isArray(v.keywords)&&v.keywords.length>=2&&v.keywords.length<=5&&v.keywords.every(x=>bounded(x,40))&&bounded(v.useCase,240)&&facts.every(f=>f.kind!=='unclassified');
    return {analysisVersion:enriched?3:2,keywords:enriched?v.keywords:[],useCase:enriched?v.useCase:'',protocolVersion:VERSION,summary:v.summary.trim(),question:v.question.trim(),facts,evidence:facts.map(f=>f.quote),interpretation:{connection:v.interpretation.connection,difference:v.interpretation.difference},action:{task:v.action.task,deliverable:v.action.deliverable,check:v.action.check},unknowns:v.unknowns,clarification:v.clarification};
  }
  return {VERSION,schema,analysisRules,context,validate};
});
