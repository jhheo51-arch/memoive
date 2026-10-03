(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LinkReader = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function validateHttpUrl(value) {
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
      return '';
    }
  }

  function cleanMarkdown(markdown) {
    return markdown
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*+]\s+/gm, '')
      .replace(/^>\s?/gm, '')
      .replace(/[`*_~|]/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function parseReaderText(raw, fallbackUrl) {
    const title = raw.match(/^Title:\s*(.+)$/m)?.[1]?.trim() || new URL(fallbackUrl).hostname;
    const published = raw.match(/^Published Time:\s*(.+)$/m)?.[1]?.trim() || '';
    const marker = 'Markdown Content:';
    const content = cleanMarkdown(raw.includes(marker) ? raw.split(marker).slice(1).join(marker) : raw);
    if (content.length < 80) throw new Error('본문이 충분하지 않습니다.');
    return { title, published, content };
  }

  function meaningfulSentences(text) {
    const ignored = /^(안녕하세요|이번 글에서는|로그인|회원가입|구독|공유|메뉴|목차|관련 기사|광고|copyright|all rights reserved)/i;
    return text
      .split(/(?<=[.!?。！？])\s+|\n+/)
      .map(sentence => sentence.replace(/\s+/g, ' ').trim())
      .filter(sentence => sentence.length >= 28 && sentence.length <= 260 && !ignored.test(sentence))
      .filter((sentence, index, all) => all.indexOf(sentence) === index);
  }

  function summarize(content, title) {
    const sentences = meaningfulSentences(content);
    if (!sentences.length) throw new Error('정리할 문장을 찾지 못했습니다.');
    const titleWords = title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(word => word.length > 1);
    const ranked = sentences
      .map((text, index) => ({
        text,
        index,
        score: titleWords.filter(word => text.toLowerCase().includes(word)).length * 2 + (/\d/.test(text) ? 4 : 0) + (/(문제|해결|결과|사용|만들|연결|발송|도입|개선|오류|권한|테스트|배웠|핵심|중요)/.test(text) ? 2 : 0) + (/(성과|절반|평균|연동|리마인드|증가|감소)/.test(text) ? 2 : 0) + Math.max(0, 1 - index / 40) + (text.length <= 170 ? 1 : 0)
      }))
      .sort((a, b) => b.score - a.score || a.index - b.index)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index)
      .map(item => item.text);
    const points = ranked.slice(0, 3);
    return {
      summary: points.slice(0, 2).join(' '),
      points,
      quote: points[0],
      evidence: points.map((text, index) => ({ label: `원문 근거 ${index + 1}`, text }))
    };
  }

  return {
    validateHttpUrl,
    parseReaderText,
    summarize,
    readerUrl: url => `https://r.jina.ai/${url}`
  };
});
