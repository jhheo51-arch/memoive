(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DataTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const text = value => typeof value === 'string' ? value : '';
  const list = value => Array.isArray(value) ? value.map(text).filter(Boolean) : [];
  const safeUrl = value => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  function linkType(value) {
    try { const u=new URL(value),h=u.hostname.toLowerCase().replace(/^www\./,'');
      return h==='youtu.be'||(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(h)&&(/^\/(watch|shorts\/|embed\/|live\/)/.test(u.pathname)))||((h==='vimeo.com'||h==='player.vimeo.com')&&/^\/(?:video\/)?\d+/.test(u.pathname))||/\.(mp4|webm|mov)$/i.test(u.pathname)?'video':'article';
    } catch {return 'article';}
  }
  function typeLabel(type){return ({article:'ARTICLE',video:'VIDEO',image:'IMAGE',voice:'VOICE',text:'TEXT'})[type]||'TEXT';}
  function cleanRecord(record) {
    if (!record || typeof record !== 'object' || !text(record.id) || !text(record.title)) return null;
    return {
      ...record,
      id: text(record.id),
      type: text(record.type) || 'text',
      label: typeLabel(text(record.type)||'text'),
      savedAt: /^\d{4}-\d{2}-\d{2}$/.test(record.savedAt) ? record.savedAt : new Date().toISOString().slice(0, 10),
      capturedAt: typeof record.capturedAt === 'string' && Number.isFinite(Date.parse(record.capturedAt)) ? new Date(record.capturedAt).toISOString() : '',
      sourceDate: text(record.sourceDate),
      title: text(record.title),
      source: text(record.source),
      url: safeUrl(record.url),
      thumbnailUrl: safeUrl(record.thumbnailUrl),
      summary: text(record.summary),
      sourceBody: text(record.sourceBody),
      bodySavedAt: text(record.bodySavedAt),
      bodyMethod: text(record.bodyMethod),
      thought: text(record.thought),
      applicationIdea: text(record.applicationIdea),
      quote: text(record.quote),
      uncertainty: text(record.uncertainty),
      points: list(record.points),
      topics: list(record.topics),
      actions: list(record.actions),
      evidence: Array.isArray(record.evidence) ? record.evidence.map(item => ({ label: text(item?.label), text: text(item?.text) })).filter(item => item.text) : [],
      confidence: Number.isFinite(Number(record.confidence)) ? Math.max(0, Math.min(100, Number(record.confidence))) : 0,
      revisitOn: /^\d{4}-\d{2}-\d{2}$/.test(record.revisitOn) ? record.revisitOn : ''
    };
  }

  function validateBackup(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (!data || typeof data !== 'object' || !Array.isArray(data.records)) throw new Error('MEMOIVE 백업 파일이 아니에요.');
    const records = data.records.map(cleanRecord).filter(Boolean);
    if (records.length !== data.records.length) throw new Error('잘못된 기록이 포함돼 가져오기를 중단했어요. 기존 기록은 그대로예요.');
    if (new Set(records.map(record=>record.id)).size!==records.length) throw new Error('같은 ID의 기록이 중복된 백업이에요. 가져오지 않았어요.');
    if (data.outputs!==undefined && (!Array.isArray(data.outputs) || data.outputs.some(output=>!cleanOutput(output)) || new Set(data.outputs.map(output=>output.id)).size!==data.outputs.length)) throw new Error('잘못되거나 중복된 결과물이 포함돼 가져오기를 중단했어요.');
    const reminderFrequency = ['daily', '3', '1'].includes(String(data.reminderFrequency)) ? String(data.reminderFrequency) : '3';
    const reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime) ? data.reminderTime : '07:00';
    return { records, dismissedExampleIds: Array.isArray(data.dismissedExampleIds) ? data.dismissedExampleIds.filter(id=>typeof id==='string') : [], outputs: cleanOutputs(data.outputs), role: text(data.role), resurface: data.resurface !== false, reminderFrequency, reminderTime, analytics: cleanAnalytics(data.analytics) };
  }

  function cleanOutput(output) {
    if (!output || typeof output !== 'object' || !text(output.id) || !text(output.title)) return null;
    const rawType = output.type === 'social' ? 'social_post' : output.type;
    const type = ['idea', 'article', 'brunch', 'social_post', 'social_story', 'proposal', 'project'].includes(rawType) ? rawType : 'idea';
    const tone = ['insight', 'friendly', 'clear'].includes(output.tone) ? output.tone : 'insight';
    const shareFormat = output.shareFormat === 'story' ? 'story' : 'post';
    const now = new Date().toISOString();
    return {
      id: text(output.id),
      type,
      tone,
      shareFormat,
      draftOrigin: ['ai','basic'].includes(output.draftOrigin) ? output.draftOrigin : 'unknown',
      purpose: text(output.purpose),
      viewpoint: text(output.viewpoint),
      title: text(output.title),
      body: text(output.body),
      usedAt: text(output.useNote).trim() && Number.isFinite(Date.parse(output.usedAt)) ? output.usedAt : '',
      useNote: text(output.useNote),
      sourceRecordIds: list(output.sourceRecordIds),
      workspaceId: text(output.workspaceId),
      traces: Array.isArray(output.traces) ? output.traces.filter(t=>t&&text(t.id)&&text(t.claim)&&text(t.quote)).map(t=>({id:text(t.id),recordId:text(t.recordId),claim:text(t.claim),quote:text(t.quote),title:text(t.title),url:safeUrl(t.url),kind:['source','interpretation','thought'].includes(t.kind)?t.kind:'source',at:text(t.at)})) : [],
      sourceLinkedAt: Object.fromEntries(list(output.sourceRecordIds).map(id=>[id,Number.isFinite(Date.parse(output.sourceLinkedAt?.[id]))?output.sourceLinkedAt[id]:''])),
      createdAt: Number.isFinite(Date.parse(output.createdAt)) ? output.createdAt : now,
      updatedAt: Number.isFinite(Date.parse(output.updatedAt)) ? output.updatedAt : now
    };
  }

  function cleanOutputs(value) {
    return Array.isArray(value) ? value.map(cleanOutput).filter(Boolean) : [];
  }

  function mergeOutputs(current, incoming) {
    // Current edits take precedence over an older same-ID backup.
    const outputs = [...cleanOutputs(incoming), ...cleanOutputs(current)];
    return [...new Map(outputs.map(output => [output.id, output])).values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  function cleanAnalytics(value) {
    const events = Array.isArray(value?.events) ? value.events.slice(-2000).map(event => ({
      id: text(event?.id),
      name: text(event?.name),
      at: Number.isFinite(Date.parse(event?.at)) ? event.at : new Date().toISOString(),
      recordId: text(event?.recordId),
      type: text(event?.type),
      value: text(event?.value)
    })).filter(event => event.id && event.name) : [];
    return { events };
  }

  function mergeAnalytics(current, incoming) {
    const events = [...cleanAnalytics(current).events, ...cleanAnalytics(incoming).events];
    return { events: [...new Map(events.map(event => [event.id, event])).values()].slice(-2000) };
  }

  function analyticsSummary(records, events, outputs = []) {
    const safeRecords = (Array.isArray(records) ? records : []).filter(record => !isExample(record));
    const safeEvents = cleanAnalytics({ events }).events;
    const recordIds = new Set(safeRecords.map(record => record.id));
    const safeOutputs = cleanOutputs(outputs).filter(output => !output.sourceRecordIds.length || output.sourceRecordIds.some(id => recordIds.has(id)));
    const convertedIds = new Set(safeOutputs.flatMap(output => output.sourceRecordIds).filter(id => recordIds.has(id)));
    const typeCounts = safeRecords.reduce((counts, record) => {
      counts[record.type || 'text'] = (counts[record.type || 'text'] || 0) + 1;
      return counts;
    }, {});
    const openedIds = new Set(safeEvents.filter(event => event.name === 'record_opened' && recordIds.has(event.recordId)).map(event => event.recordId));
    const ratings = safeRecords.map(record => record.summaryRating).filter(value => ['helpful', 'needs_work'].includes(value));
    const helpful = ratings.filter(value => value === 'helpful').length;
    const total = safeRecords.length;
    return {
      total,
      typeCounts,
      openedCount: openedIds.size,
      revisitRate: total ? Math.round(openedIds.size / total * 100) : 0,
      thoughtRate: total ? Math.round(safeRecords.filter(record => record.thought?.trim()).length / total * 100) : 0,
      ratingCount: ratings.length,
      helpfulRate: ratings.length ? Math.round(helpful / ratings.length * 100) : 0,
      reuseCount: safeEvents.filter(event => event.name === 'record_reused' && recordIds.has(event.recordId)).length,
      outputCount: safeOutputs.length,
      usedOutputCount: safeOutputs.filter(output => output.usedAt && output.useNote.trim()).length,
      convertedCount: convertedIds.size,
      conversionRate: total ? Math.round(convertedIds.size / total * 100) : 0
    };
  }

  const exampleIds = new Set(['daangn-dangbeoni', 'design-memory', 'voice-capture', 'image-timeline', 'text-question']);
  function isExample(record) { if(exampleIds.has(record?.id)&&record?.ownership==='user-confirmed')return false;return record?.isExample === true || exampleIds.has(record?.id) || ['example-toss-experiments','example-socar-customer','example-musinsa-experience'].includes(record?.id); }
  function withExamples(records, examples) {
    const key = value => { try { const u = new URL(value); u.hash = ''; return decodeURI(u.href).replace(/\/$/, ''); } catch { return ''; } };
    const merged = [...records];
    for (const sample of examples) {
      if (!merged.some(record => record.id === sample.id || (key(record.url) && key(record.url) === key(sample.url)))) merged.push({...sample});
    }
    return merged;
  }
  function recordProgress(record, outputs) {
    const linked = cleanOutputs(outputs).filter(output => output.sourceRecordIds.includes(record.id)).sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    return {hasThought:Boolean(record.thought?.trim()), output:linked[0] || null, used:linked.some(output => output.usedAt && output.useNote.trim())};
  }
  function matchesQuery(record, query = '') {
    const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
    const haystack = normalize([record.title, record.source, record.url, record.summary, record.thought,
      record.applicationIdea, ...(record.topics || []), ...(record.points || []), ...(record.evidence || []).map(item => item.text)].join(' '));
    return normalize(query).split(' ').filter(Boolean).every(word => haystack.includes(word));
  }

  // Legacy records without a time retain their relative order on the same day.
  function sortRecords(records) {
    const time = record => Number.isFinite(Date.parse(record.capturedAt)) ? Date.parse(record.capturedAt) : 0;
    return [...records].sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')) || time(b) - time(a));
  }

  function mergeRecords(current, incoming) {
    const merged = current.map(record => ({ ...record }));
    incoming.forEach(record => {
      const index = merged.findIndex(item => item.id === record.id || (item.url && record.url && item.url === record.url));
      if (index < 0) return merged.push(record);
      const existing = merged[index];
      merged[index] = {
        ...record,
        ...existing,
        thought: [...new Set([existing.thought, record.thought].filter(Boolean))].join('\n'),
        topics: [...new Set([...(existing.topics || []), ...(record.topics || [])])],
        actions: [...new Set([...(existing.actions || []), ...(record.actions || [])])]
      };
    });
    return sortRecords(merged);
  }

  const stopWords = new Set(['먼저','다시','기록','생각','내용','사용자','위해','대한','있는','하는','하면','있어요','해요','것을','그리고','하지만','기능','제품']);
  const words = value => new Set(text(value).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 1 && !stopWords.has(word)));

  function relatedRecords(record, records) {
    const baseWords = words([record.title, record.summary, record.thought].join(' '));
    return records.filter(item => item.id !== record.id).map(item => {
      const sharedTopics = (item.topics || []).filter(topic => (record.topics || []).includes(topic));
      const sharedWords = [...words([item.title, item.summary, item.thought].join(' '))].filter(word => baseWords.has(word)).slice(0, 3);
      return { record: item, score: sharedTopics.length * 4 + sharedWords.length, reason: sharedTopics[0] ? `‘${sharedTopics[0]}’ 주제가 이어져요.` : sharedWords[0] ? `‘${sharedWords[0]}’ 생각이 반복돼요.` : '' };
    }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  function toMarkdown(record) {
    const points = (record.points || []).map(point => `- ${point}`).join('\n');
    const topics = (record.topics || []).map(topic => `#${topic.replace(/\s+/g, '_')}`).join(' ');
    return `# ${record.title}\n\n${record.summary}\n\n## 핵심 내용\n${points}\n\n## 나의 기록\n${record.thought || '아직 작성하지 않음'}\n\n${topics}\n\n원문: ${record.url || record.source}`;
  }

  function buildDraft({ type = 'idea', tone = 'insight', purpose = '', viewpoint = '', records = [] } = {}) {
    const safeRecords = records.map(cleanRecord).filter(Boolean).slice(0, 10);
    if (!safeRecords.length) throw new Error('결과물에 사용할 기록이 필요해요.');
    const focus = safeRecords[0].topics[0] || safeRecords[0].title;
    tone = ['insight', 'friendly', 'clear'].includes(tone) ? tone : 'insight';
    const unique = values => [...new Map(values.filter(Boolean).map(value => [String(value).replace(/[\s.!?。]+/g, '').toLowerCase(), String(value).trim()])).values()];
    const insightLines = unique(safeRecords.map(record => record.thought || record.summary));
    const evidenceLines = unique(safeRecords.map(record => `${record.title}: ${record.summary}`));
    const insights = evidenceLines.map(value => `- ${value}`).join('\n');
    const evidence = evidenceLines.map(value => `- ${value}`).join('\n');
    const intent = purpose || '이 영감을 실제 행동으로 이어가기 위해';
    const view = viewpoint || '기록에서 반복되는 생각을 하나의 방향으로 연결한다.';
    const attachParticle = (value, batchim, noBatchim) => { const code = value.trim().charCodeAt(value.trim().length - 1); const hasBatchim = code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 !== 0; return `${value}${hasBatchim ? batchim : noBatchim}`; };
    const hooks = {
      insight: `${attachParticle(focus, '을', '를')} 다시 보니, 답보다 중요한 질문이 남았습니다.`,
      friendly: `저장만 해둔 ${focus}, 다시 꺼내보니 이런 생각이 남았어요.`,
      clear: `${attachParticle(focus, '은', '는')} 더 모으는 문제가 아니라 실행으로 옮기는 문제입니다.`
    };
    const hook = hooks[tone];
    const firstInsight = safeRecords[0].summary;
    const drafts = {
      brunch: { title: `${focus}, 기록에서 시작된 질문`, body: `## 마음에 남은 질문\n${purpose || '[이 글에서 함께 생각해 볼 질문을 적어 주세요.]'}\n\n## 기록을 읽으며\n${evidenceLines.join('\n\n')}\n\n## 나의 관점\n${viewpoint || '[직접 느낀 점이나 생각을 적어 주세요. 경험은 임의로 만들지 않습니다.]'}\n\n## 글을 닫으며\n[앞의 관점을 돌아보며 독자에게 남기고 싶은 질문을 적어 주세요.]\n\n참고한 기록\n${safeRecords.map(r => `${r.title}${r.url ? ' — '+r.url : ''}`).join('\n')}` },
      idea: { title: `${focus}에서 발견한 실행 아이디어`, body: `## 만들고 싶은 변화\n${intent}\n\n## 영감에서 발견한 것\n${insights}\n\n## 나의 관점\n${view}\n\n## 가장 작은 다음 행동\n오늘 바로 시험할 수 있는 한 가지 행동을 정하고, 결과를 다시 기록한다.` },
      article: { title: `${focus}, 저장한 정보가 나의 관점이 되는 순간`, body: `${hook}\n\n## 기록에서 확인한 것\n${insights}\n\n## 나의 관점\n${view}\n\n## 이 관점을 뒷받침한 기록\n${evidence}\n\n## 다음으로 이어갈 것\n${intent}. 그래서 가장 작은 실험부터 시작하고, 무엇이 달라졌는지 다시 기록해보려 합니다.` },
      social_post: { title: `${focus}, 저장에서 실행으로`, body: `${hook}\n\n기록에서 확인한 것\n${insights}\n\n나의 관점\n${view}\n\n다음 행동\n${intent}. 오늘 바로 시험할 수 있는 한 가지부터 시작합니다.\n\n#영감기록 #생각정리 #MEMOIVE` },
      social_story: { title: `${attachParticle(focus, '을', '를')} 다시 꺼낸 이유`, body: `${hook}\n\n기록에서 확인\n${firstInsight}\n\n나의 관점\n${view}\n\n다음 한 걸음\n${intent}.` },
      proposal: { title: `${focus} 개선 제안`, body: `## 제안 목적\n${intent}\n\n## 관찰한 문제와 기회\n${evidence}\n\n## 제안 방향\n${view}\n\n## 첫 실행\n작은 범위에서 먼저 시험하고 사용자의 반응과 결과를 기록한다.\n\n## 확인할 지표\n실행 여부, 재사용률, 사용자가 느낀 도움 정도를 확인한다.` },
      project: { title: `${focus} 프로젝트 초안`, body: `## 배경\n${evidence}\n\n## 프로젝트 목표\n${intent}\n\n## 핵심 가설\n${view}\n\n## 첫 번째 버전\n가장 중요한 흐름 하나만 실제로 작동하게 만든다.\n\n## 검증 방법\n직접 사용한 행동과 피드백을 기록하고 다음 버전의 우선순위를 정한다.` }
    };
    return drafts[type] || drafts.idea;
  }

  return { linkType, typeLabel, sortRecords, validateBackup, mergeRecords, cleanOutputs, mergeOutputs, cleanAnalytics, mergeAnalytics, analyticsSummary, relatedRecords, toMarkdown, buildDraft, isExample, matchesQuery, withExamples, recordProgress };
});
