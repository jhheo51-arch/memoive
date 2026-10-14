(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ReflectionTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const text = value => typeof value === 'string' ? value.trim() : '';
  const dayNumber = iso => { const t = Date.parse(`${String(iso).slice(0, 10)}T00:00:00Z`); return Number.isFinite(t) ? Math.round(t / 86400000) : NaN; };

  /* P2 ⑥ — a past thought to revisit today. */
  const ANNIVERSARIES = [[365, '1년 전 오늘의 생각'], [90, '3개월 전 오늘의 생각'], [30, '1개월 전 오늘의 생각']];
  // Records saved exactly 365, 90 or 30 days ago with a thought; the longest gap wins, one per day.
  function memoryOfTheDay(records, today, { isExample = () => false, skip = [] } = {}) {
    const eligible = (records || []).filter(r => r && !r.resurfaceOff && !skip.includes(r.id) && !isExample(r) && text(r.thought));
    for (const [days, label] of ANNIVERSARIES) {
      const hit = eligible.filter(r => dayNumber(today) - dayNumber(r.savedAt) === days).sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
      if (hit) return { record: hit, days, label };
    }
    return null;
  }

  /* P2 ⑤ — principles: one sentence the person writes, backed by at least two records. */
  const MIN_EVIDENCE = 2, MAX_PRINCIPLES = 100;
  const iso = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : '';
  const unique = list => [...new Set((Array.isArray(list) ? list : []).filter(id => typeof id === 'string' && id))];
  function cleanPrinciples(list) {
    if (!Array.isArray(list)) return [];
    const out = list.map(p => {
      const statement = text(p?.statement).slice(0, 120);
      if (!text(p?.id) || !statement) return null;
      const history = Array.isArray(p.history) ? p.history.map(h => ({ at: iso(h?.at), statement: text(h?.statement).slice(0, 120) })).filter(h => h.at && h.statement).slice(-20) : [];
      return { id: text(p.id), statement, reason: text(p.reason).slice(0, 1000), experience: text(p.experience).slice(0, 1000), evidenceIds: unique(p.evidenceIds).slice(0, 20), history, createdAt: iso(p.createdAt), updatedAt: iso(p.updatedAt) };
    }).filter(Boolean);
    return [...new Map(out.map(p => [p.id, p])).values()].slice(0, MAX_PRINCIPLES);
  }
  // Fewer than two existing evidence records keeps it a draft; deleted records are reported, not removed.
  function principleStatus(principle, records) {
    const ids = new Set((records || []).map(r => r.id));
    const live = principle.evidenceIds.filter(id => ids.has(id)), missing = principle.evidenceIds.filter(id => !ids.has(id));
    return { draft: live.length < MIN_EVIDENCE, live, missing };
  }
  function savePrinciple(list, fields, now = new Date().toISOString(), id = '') {
    const principles = cleanPrinciples(list), statement = text(fields?.statement);
    if (!statement) throw new Error('원칙을 한 문장으로 적어 주세요.');
    if (statement.length > 120) throw new Error('원칙은 120자 이내의 한 문장으로 적어 주세요.');
    const values = { statement, reason: text(fields.reason).slice(0, 1000), experience: text(fields.experience).slice(0, 1000), evidenceIds: unique(fields.evidenceIds).slice(0, 20), updatedAt: now };
    const index = id ? principles.findIndex(p => p.id === id) : -1;
    if (index < 0) {
      if (principles.length >= MAX_PRINCIPLES) throw new Error(`원칙은 ${MAX_PRINCIPLES}개까지 저장할 수 있어요.`);
      return [...principles, { id: id || `principle-${Date.parse(now).toString(36)}${Math.random().toString(36).slice(2, 6)}`, ...values, history: [], createdAt: now }];
    }
    const current = principles[index];
    // Earlier wordings are kept so the person can see how the principle changed.
    const history = current.statement !== statement ? [...current.history, { at: current.updatedAt || current.createdAt || now, statement: current.statement }].slice(-20) : current.history;
    principles[index] = { ...current, ...values, history };
    return principles;
  }
  function mergePrinciples(current, incoming) {
    const merged = new Map(cleanPrinciples(current).map(p => [p.id, p]));
    cleanPrinciples(incoming).forEach(p => { const mine = merged.get(p.id); if (!mine || p.updatedAt > mine.updatedAt) merged.set(p.id, p); });
    return [...merged.values()].slice(0, MAX_PRINCIPLES);
  }
  // Words that recur across the selected records' thoughts: a hint for writing, never the principle itself.
  function sharedThoughtWords(records, words) {
    const counts = new Map();
    (records || []).forEach(r => words(r.thought).forEach(w => counts.set(w, (counts.get(w) || 0) + 1)));
    return [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([w]) => w);
  }
  // Principles that share words with a record and do not already use it as evidence.
  function principleMatches(record, principles, relate) {
    return cleanPrinciples(principles).filter(p => !p.evidenceIds.includes(record.id)).map(p => {
      const [match] = relate(record, [{ id: p.id, title: p.statement, summary: p.reason, thought: p.experience, topics: [] }]);
      return match ? { principle: p, words: [...match.evidence.thoughtWords, ...match.evidence.words].slice(0, 3) } : null;
    }).filter(m => m && m.words.length).slice(0, 2);
  }

  /* P2 ④ — monthly reflection computed on this device. */
  const MIN_REPORT_RECORDS = 5, BIAS_SHARE = 0.6;
  const monthOf = day => String(day || '').slice(0, 7);
  function reportMonths(records, isExample = () => false) {
    return [...new Set((records || []).filter(r => !isExample(r)).map(r => monthOf(r.savedAt)).filter(m => /^\d{4}-\d{2}$/.test(m)))].sort().reverse();
  }
  const countBy = (items, key) => [...items.reduce((map, item) => { (key(item) || []).forEach(k => map.set(k, (map.get(k) || 0) + 1)); return map; }, new Map())].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  function monthlyReport(records, month, { isExample = () => false, localDay = () => '', relate = () => [], perspectiveName = id => id } = {}) {
    const mine = (records || []).filter(r => !isExample(r));
    const inMonth = mine.filter(r => monthOf(r.savedAt) === month);
    const total = inMonth.length;
    const entriesOf = r => Array.isArray(r.thoughts) ? r.thoughts : [];
    const byTopic = countBy(inMonth, r => (r.topics || []).slice(0, 3));
    const topTopic = byTopic[0];
    // A record "came back" this month if a thought was added or changed this month on a later day than it was saved.
    const revisited = mine.filter(r => entriesOf(r).some(e => [e.createdAt, e.updatedAt].some(at => { const day = localDay(at); return day && monthOf(day) === month && day > r.savedAt; })));
    const connected = inMonth.map(r => ({ record: r, count: relate(r, mine).length })).filter(c => c.count).sort((a, b) => b.count - a.count)[0] || null;
    return {
      month, total, enough: total >= MIN_REPORT_RECORDS,
      thoughtRate: total ? Math.round(inMonth.filter(r => text(r.thought)).length / total * 100) : 0,
      byTopic, byType: countBy(inMonth, r => [r.type || 'text']),
      byPerspective: countBy(inMonth, r => [...new Set(entriesOf(r).map(e => e.perspectiveId).filter(Boolean))].map(perspectiveName)),
      revisitedIds: revisited.map(r => r.id),
      mostConnected: connected && { id: connected.record.id, title: connected.record.title, count: connected.count },
      bias: total >= MIN_REPORT_RECORDS && topTopic && topTopic[1] / total >= BIAS_SHARE ? { topic: topTopic[0], share: Math.round(topTopic[1] / total * 100) } : null
    };
  }
  // AI summaries are stored per month; record references are ids that must still exist to be shown.
  function cleanReflections(value) {
    const out = {};
    Object.entries(value && typeof value === 'object' && !Array.isArray(value) ? value : {}).forEach(([month, r]) => {
      if (!/^\d{4}-\d{2}$/.test(month) || !Array.isArray(r?.themes)) return;
      const themes = r.themes.map(t => ({ theme: text(t?.theme).slice(0, 80), recordIds: unique(t?.recordIds).slice(0, 10) })).filter(t => t.theme).slice(0, 3);
      const explore = (Array.isArray(r.explore) ? r.explore : []).map(x => text(x).slice(0, 120)).filter(Boolean).slice(0, 3);
      if (themes.length) out[month] = { themes, explore, createdAt: iso(r.createdAt) };
    });
    return out;
  }

  return { dayNumber, memoryOfTheDay, MIN_EVIDENCE, cleanPrinciples, principleStatus, savePrinciple, mergePrinciples, sharedThoughtWords, principleMatches, MIN_REPORT_RECORDS, reportMonths, monthlyReport, cleanReflections };
});
