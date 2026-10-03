(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.DataTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const text = value => typeof value === 'string' ? value.slice(0, 10000) : '';
  const list = value => Array.isArray(value) ? value.map(text).filter(Boolean).slice(0, 50) : [];
  const safeUrl = value => {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  };

  function cleanRecord(record) {
    if (!record || typeof record !== 'object' || !text(record.id) || !text(record.title)) return null;
    return {
      ...record,
      id: text(record.id),
      type: text(record.type) || 'text',
      label: text(record.label) || 'TEXT',
      savedAt: /^\d{4}-\d{2}-\d{2}$/.test(record.savedAt) ? record.savedAt : new Date().toISOString().slice(0, 10),
      sourceDate: text(record.sourceDate),
      title: text(record.title),
      source: text(record.source),
      url: safeUrl(record.url),
      summary: text(record.summary),
      thought: text(record.thought),
      quote: text(record.quote),
      uncertainty: text(record.uncertainty),
      points: list(record.points),
      topics: list(record.topics),
      actions: list(record.actions),
      evidence: Array.isArray(record.evidence) ? record.evidence.slice(0, 20).map(item => ({ label: text(item?.label), text: text(item?.text) })).filter(item => item.text) : [],
      confidence: Number.isFinite(Number(record.confidence)) ? Math.max(0, Math.min(100, Number(record.confidence))) : 0,
      revisitOn: /^\d{4}-\d{2}-\d{2}$/.test(record.revisitOn) ? record.revisitOn : ''
    };
  }

  function validateBackup(input) {
    const data = typeof input === 'string' ? JSON.parse(input) : input;
    if (!data || typeof data !== 'object' || !Array.isArray(data.records)) throw new Error('MEMOIVE 백업 파일이 아니에요.');
    const records = data.records.map(cleanRecord).filter(Boolean);
    if (!records.length && data.records.length) throw new Error('가져올 수 있는 기록이 없어요.');
    const reminderFrequency = ['daily', '3', '1'].includes(String(data.reminderFrequency)) ? String(data.reminderFrequency) : '3';
    const reminderTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(data.reminderTime) ? data.reminderTime : '07:00';
    return { records, outputs: cleanOutputs(data.outputs), role: text(data.role), resurface: data.resurface !== false, reminderFrequency, reminderTime, analytics: cleanAnalytics(data.analytics) };
  }

  function cleanOutput(output) {
    if (!output || typeof output !== 'object' || !text(output.id) || !text(output.title)) return null;
    const type = ['idea', 'article', 'social', 'proposal', 'project'].includes(output.type) ? output.type : 'idea';
    const now = new Date().toISOString();
    return {
      id: text(output.id),
      type,
      purpose: text(output.purpose),
      viewpoint: text(output.viewpoint),
      title: text(output.title),
      body: text(output.body),
      sourceRecordIds: list(output.sourceRecordIds),
      createdAt: Number.isFinite(Date.parse(output.createdAt)) ? output.createdAt : now,
      updatedAt: Number.isFinite(Date.parse(output.updatedAt)) ? output.updatedAt : now
    };
  }

  function cleanOutputs(value) {
    return Array.isArray(value) ? value.map(cleanOutput).filter(Boolean).slice(0, 500) : [];
  }

  function mergeOutputs(current, incoming) {
    const outputs = [...cleanOutputs(current), ...cleanOutputs(incoming)];
    return [...new Map(outputs.map(output => [output.id, output])).values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 500);
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
    const safeRecords = Array.isArray(records) ? records : [];
    const safeEvents = cleanAnalytics({ events }).events;
    const safeOutputs = cleanOutputs(outputs);
    const recordIds = new Set(safeRecords.map(record => record.id));
    const convertedIds = new Set(safeOutputs.flatMap(output => output.sourceRecordIds).filter(id => recordIds.has(id)));
    const typeCounts = safeRecords.reduce((counts, record) => {
      counts[record.type || 'text'] = (counts[record.type || 'text'] || 0) + 1;
      return counts;
    }, {});
    const openedIds = new Set(safeEvents.filter(event => event.name === 'record_opened').map(event => event.recordId));
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
      reuseCount: safeEvents.filter(event => event.name === 'record_reused').length,
      outputCount: safeOutputs.length,
      convertedCount: convertedIds.size,
      conversionRate: total ? Math.round(convertedIds.size / total * 100) : 0
    };
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
    return merged.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
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

  function buildDraft({ type = 'idea', purpose = '', viewpoint = '', records = [] } = {}) {
    const safeRecords = records.map(cleanRecord).filter(Boolean).slice(0, 10);
    if (!safeRecords.length) throw new Error('결과물에 사용할 기록이 필요해요.');
    const focus = safeRecords[0].topics[0] || safeRecords[0].title;
    const insights = safeRecords.map(record => `- ${record.thought || record.summary}`).join('\n');
    const evidence = safeRecords.map(record => `- ${record.title}: ${record.summary}`).join('\n');
    const intent = purpose || '이 영감을 실제 행동으로 이어가기 위해';
    const view = viewpoint || '기록에서 반복되는 생각을 하나의 방향으로 연결한다.';
    const drafts = {
      idea: { title: `${focus}에서 발견한 실행 아이디어`, body: `## 만들고 싶은 변화\n${intent}\n\n## 영감에서 발견한 것\n${insights}\n\n## 나의 관점\n${view}\n\n## 가장 작은 다음 행동\n오늘 바로 시험할 수 있는 한 가지 행동을 정하고, 결과를 다시 기록한다.` },
      article: { title: `${focus}, 정보가 나의 관점이 되는 순간`, body: `${intent}. 여러 기록을 다시 읽으며 하나의 질문이 남았다.\n\n## 발견한 영감\n${insights}\n\n## 내가 새롭게 본 지점\n${view}\n\n## 기록이 말해주는 근거\n${evidence}\n\n## 다음으로 이어갈 것\n이 관점을 작은 실험으로 옮기고, 무엇이 달라졌는지 다시 기록해보려 한다.` },
      social: { title: `${focus}에서 건진 한 가지`, body: `${view}\n\n저장한 기록에서 발견한 핵심:\n${insights}\n\n${intent}.\n\n#영감기록 #MEMOIVE` },
      proposal: { title: `${focus} 개선 제안`, body: `## 제안 목적\n${intent}\n\n## 관찰한 문제와 기회\n${evidence}\n\n## 제안 방향\n${view}\n\n## 첫 실행\n작은 범위에서 먼저 시험하고 사용자의 반응과 결과를 기록한다.\n\n## 확인할 지표\n실행 여부, 재사용률, 사용자가 느낀 도움 정도를 확인한다.` },
      project: { title: `${focus} 프로젝트 초안`, body: `## 배경\n${evidence}\n\n## 프로젝트 목표\n${intent}\n\n## 핵심 가설\n${view}\n\n## 첫 번째 버전\n가장 중요한 흐름 하나만 실제로 작동하게 만든다.\n\n## 검증 방법\n직접 사용한 행동과 피드백을 기록하고 다음 버전의 우선순위를 정한다.` }
    };
    return drafts[type] || drafts.idea;
  }

  return { validateBackup, mergeRecords, cleanOutputs, mergeOutputs, cleanAnalytics, mergeAnalytics, analyticsSummary, relatedRecords, toMarkdown, buildDraft };
});
