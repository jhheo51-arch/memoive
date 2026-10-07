(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.MemoiveAnalytics=api;})(globalThis,function(){
  const DAY=86400000, time=v=>Number.isFinite(Date.parse(v))?Date.parse(v):null;
  const percent=(n,d)=>d?Math.round(n/d*100):null;
  function summarize(records,outputs,events,isExample,days=0,now=Date.now()){
    const real=records.filter(r=>!isExample(r)),ids=new Set(real.map(r=>r.id));
    const outs=outputs.filter(o=>o.sourceRecordIds.some(id=>ids.has(id)));
    const validEvents=events.filter(e=>time(e.at)!==null&&time(e.at)<=now).sort((a,b)=>time(a.at)-time(b.at));
    const start=days?now-days*DAY:-Infinity,previousStart=days?start-days*DAY:-Infinity;
    const inWindow=(v,a=start,b=now)=>time(v)!==null&&time(v)>=a&&time(v)<b;
    const captured=r=>r.capturedAt||(r.savedAt?`${r.savedAt}T00:00:00`:'');
    const selected=days?real.filter(r=>inWindow(captured(r))):real;
    const linked=new Set(outs.flatMap(o=>o.sourceRecordIds));
    const opened=new Set(validEvents.filter(e=>e.name==='record_opened').map(e=>e.recordId));
    real.forEach(r=>{if(r.analysisFirstOpenedAt)opened.add(r.id);});
    const thought=selected.filter(r=>r.thought?.trim()).length;
    const converted=selected.filter(r=>linked.has(r.id)).length;
    const eligible=selected.filter(r=>time(r.capturedAt)!==null&&now-time(r.capturedAt)>=DAY);
    const delayed=eligible.filter(r=>time(r.analysisDelayedOpenedAt)>=time(r.capturedAt)+DAY||validEvents.some(e=>e.name==='record_opened'&&e.recordId===r.id&&time(e.at)>=time(r.capturedAt)+DAY));
    const missingLinks=selected.filter(r=>outs.some(o=>o.sourceRecordIds.includes(r.id)&&time(o.sourceLinkedAt?.[r.id])===null));
    const mature=selected.filter(r=>time(r.capturedAt)!==null&&now-time(r.capturedAt)>=7*DAY&&!missingLinks.includes(r));
    const converted7=mature.filter(r=>outs.some(o=>o.sourceRecordIds.includes(r.id)&&time(o.sourceLinkedAt?.[r.id])!==null&&time(o.sourceLinkedAt[r.id])>=time(r.capturedAt)&&time(o.sourceLinkedAt[r.id])<=time(r.capturedAt)+7*DAY));
    const activity=(a,b)=>({saved:real.filter(r=>inWindow(captured(r),a,b)).length,outputs:outs.filter(o=>inWindow(o.createdAt,a,b)).length,used:outs.filter(o=>o.useNote?.trim()&&inWindow(o.usedAt,a,b)).length});
    const breakdown=key=>{const groups=new Map();for(const r of selected){for(const label of new Set(key(r))){const g=groups.get(label)||{label,total:0,converted:0};g.total++;if(linked.has(r.id))g.converted++;groups.set(label,g);}}return [...groups.values()].sort((a,b)=>b.total-a.total||a.label.localeCompare(b.label));};
    const eventMeta=e=>{try{return JSON.parse(e.value);}catch{return {};}};
    const ai=validEvents.filter(e=>e.name==='ai_measure_v1'&&inWindow(e.at)&&(!e.recordId||ids.has(e.recordId))).map(e=>({...eventMeta(e),at:e.at}));
    const ratings=new Map();validEvents.filter(e=>e.name==='summary_rating_v2'&&ids.has(e.recordId)).forEach(e=>{const m=eventMeta(e);if(inWindow(e.at))ratings.set(e.recordId+':'+m.responseId,{...m,at:e.at});});
    const ratingRows=['ai','basic'].map(origin=>{const rows=[...ratings.values()].filter(r=>r.origin===origin);return{origin,total:rows.length,helpful:rows.filter(r=>r.rating==='helpful').length};});
    const backlog={unopened:real.filter(r=>!opened.has(r.id)),unused:real.filter(r=>opened.has(r.id)&&!linked.has(r.id)),unconfirmed:outs.filter(o=>!o.usedAt||!o.useNote?.trim())};
    return{total:real.length,selected,thought,opened:selected.filter(r=>opened.has(r.id)).length,converted,conversionRate:percent(converted,selected.length),outputCount:outs.length,usedOutputCount:outs.filter(o=>o.usedAt&&o.useNote?.trim()).length,
      missingLinkTime:missingLinks.length,legacyRatings:real.filter(r=>['helpful','needs_work'].includes(r.summaryRating)&&!validEvents.some(e=>e.name==='summary_rating_v2'&&e.recordId===r.id)).length,eligible:eligible.length,delayed:delayed.length,unknownTime:selected.filter(r=>!r.capturedAt).length,mature:mature.length,converted7:converted7.length,
      current:activity(start,now),previous:days?activity(previousStart,start):null,types:breakdown(r=>[r.type||'text']),topics:breakdown(r=>r.topics?.length?r.topics:['주제 없음']),backlog,
      ai:['insight','draft'].map(kind=>{const rows=ai.filter(a=>a.kind===kind);return{kind,success:rows.filter(a=>a.status==='success').length,failed:rows.filter(a=>a.status==='failed').length,discarded:rows.filter(a=>a.status==='discarded').length,timeouts:rows.filter(a=>a.reason==='timeout').length,limited:rows.filter(a=>a.reason==='limit').length};}),ratings:ratingRows,
      originOutputs:['ai','basic','unknown'].map(origin=>({origin,count:outs.filter(o=>(o.draftOrigin||'unknown')===origin&&inWindow(o.createdAt)).length})),
      reuse:validEvents.filter(e=>e.name==='record_reused'&&ids.has(e.recordId)&&inWindow(e.at)).length,
      capped:events.length>=2000,firstEvent:validEvents.map(e=>e.at).sort()[0]||'',percent};
  }
  return{summarize,percent};
});
