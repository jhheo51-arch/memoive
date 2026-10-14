(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PerspectiveTools = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  // `base` is the built-in role the AI server accepts; custom perspectives borrow the closest one.
  const BUILTIN = Object.freeze([
    { id: 'planner', name: '기획자', label: '기획자 관점', hint: '제품과 사용 흐름', prompts: ['문제는 무엇인가', '내 가설', '내가 해볼 작은 실험'], base: '기획자', builtin: true },
    { id: 'marketer', name: '마케터', label: '마케터 관점', hint: '확산과 메시지', prompts: ['누구에게', '어떤 메시지로', '어느 채널에서'], base: '마케터', builtin: true },
    { id: 'researcher', name: '연구자', label: '연구자 관점', hint: '근거와 검증', prompts: ['주장', '근거의 강도', '더 확인할 것'], base: '연구자', builtin: true },
    { id: 'daily', name: '일상 기록자', label: '일상 관점', hint: '나의 경험과 변화', prompts: ['느낀 점', '내일 해볼 것'], base: '일상 기록자', builtin: true }
  ].map(Object.freeze));
  const ROLES = BUILTIN.map(p => p.name);
  const MAX_CUSTOM = 6, MAX_NAME = 20, MAX_PROMPTS = 4, MAX_PROMPT = 40;
  const text = value => typeof value === 'string' ? value.trim() : '';

  function cleanPrompts(value) {
    const lines = Array.isArray(value) ? value : String(value || '').split('\n');
    return [...new Set(lines.map(text).filter(Boolean).map(line => line.slice(0, MAX_PROMPT)))].slice(0, MAX_PROMPTS);
  }
  function cleanCustom(list) {
    if (!Array.isArray(list)) return [];
    const taken = new Set(BUILTIN.map(p => p.name.toLowerCase())), ids = new Set(BUILTIN.map(p => p.id)), out = [];
    for (const item of list) {
      const id = text(item?.id), name = text(item?.name).slice(0, MAX_NAME);
      if (!id || !name || ids.has(id) || taken.has(name.toLowerCase()) || out.length >= MAX_CUSTOM) continue;
      ids.add(id); taken.add(name.toLowerCase());
      out.push({ id, name, label: `${name} 관점`, hint: '내가 만든 관점', prompts: cleanPrompts(item.prompts), base: ROLES.includes(item?.base) ? item.base : '기획자', builtin: false });
    }
    return out;
  }
  // Questions shown when AI is off, not consented to, or failed. Answers are always the person's own.
  const DEFAULT_QUESTIONS = {
    planner: ['이 자료에서 가장 먼저 풀어야 할 문제는 무엇이라고 보나요?', '내 프로젝트라면 어떤 가설을 세워볼 수 있을까요?', '이번 주에 해볼 수 있는 가장 작은 실험은 무엇인가요?'],
    marketer: ['이 내용이 가장 필요한 사람은 누구일까요?', '그 사람에게 한 문장으로 전한다면 무엇이라고 말할까요?', '그 메시지를 어디에서 전하면 가장 잘 닿을까요?'],
    researcher: ['이 자료의 핵심 주장을 한 문장으로 적는다면 무엇인가요?', '그 주장의 근거는 얼마나 단단하다고 보나요?', '더 확인하고 싶은 것은 무엇인가요?'],
    daily: ['이 자료를 보며 무엇을 느꼈나요?', '내 하루에 비춰 보면 떠오르는 장면이 있나요?', '내일 해볼 수 있는 작은 일은 무엇인가요?']
  };
  const GENERIC_QUESTIONS = ['이 자료에서 가장 오래 남는 한 장면은 무엇인가요?', '이 내용을 내 일이나 생활에 적용한다면 어디부터일까요?', '이 생각이 틀릴 수 있는 경우는 언제일까요?'];
  function defaultQuestions(perspective) {
    if (DEFAULT_QUESTIONS[perspective?.id]) return DEFAULT_QUESTIONS[perspective.id];
    return [...(perspective?.prompts || []).map(prompt => `‘${prompt}’에 대해 이 기록에서 떠오르는 것을 적어볼까요?`), ...GENERIC_QUESTIONS];
  }
  function nextDefaultQuestion(perspective, asked = []) { return defaultQuestions(perspective).find(question => !asked.includes(question)) || ''; }

  function all(custom) { return [...BUILTIN, ...cleanCustom(custom)]; }
  function find(id, custom) { return all(custom).find(p => p.id === id) || null; }
  function idForRole(role) { return (BUILTIN.find(p => p.name === role) || BUILTIN[0]).id; }

  function validate({ name, prompts, base }, custom, editingId = '') {
    const clean = text(name);
    if (!clean) throw new Error('관점 이름을 적어 주세요.');
    if (clean.length > MAX_NAME) throw new Error(`관점 이름은 ${MAX_NAME}자 이내로 적어 주세요.`);
    if (all(custom).some(p => p.id !== editingId && p.name.toLowerCase() === clean.toLowerCase())) throw new Error('같은 이름의 관점이 이미 있어요.');
    if (!editingId && cleanCustom(custom).length >= MAX_CUSTOM) throw new Error(`내 관점은 ${MAX_CUSTOM}개까지 만들 수 있어요.`);
    return { name: clean, prompts: cleanPrompts(prompts), base: ROLES.includes(base) ? base : '기획자' };
  }
  function create(fields, custom, id = `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`) {
    return cleanCustom([...cleanCustom(custom), { id, ...validate(fields, custom) }]);
  }
  function update(id, fields, custom) {
    const valid = validate(fields, custom, id);
    return cleanCustom(cleanCustom(custom).map(p => p.id === id ? { ...p, ...valid } : p));
  }
  function remove(id, custom) { return cleanCustom(custom).filter(p => p.id !== id); }
  // Merge for backup import and sync: local definitions win, new ids are added.
  function merge(current, incoming) {
    const local = cleanCustom(current);
    return cleanCustom([...local, ...cleanCustom(incoming).filter(p => !local.some(item => item.id === p.id))]);
  }

  return { BUILTIN, ROLES, MAX_CUSTOM, defaultQuestions, nextDefaultQuestion, cleanCustom, all, find, idForRole, create, update, remove, merge };
});
