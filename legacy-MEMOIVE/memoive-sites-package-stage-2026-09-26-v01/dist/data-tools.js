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
    return { records, role: text(data.role), resurface: data.resurface !== false };
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

  return { validateBackup, mergeRecords, relatedRecords, toMarkdown };
});
