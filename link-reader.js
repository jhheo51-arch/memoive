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

  // Images remain external references: never execute data/javascript URLs or request local hosts.
  function safeImageUrl(value, base) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value, base);
      const host = url.hostname.toLowerCase();
      if (url.protocol !== 'https:' || url.username || url.password || !host.includes('.') || /^[\d.]+$/.test(host) || host.includes(':') || /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)) return '';
      return url.href;
    } catch { return ''; }
  }

  function readerImage(raw, base) {
    const content = raw.includes('Markdown Content:') ? raw.split('Markdown Content:').slice(1).join('Markdown Content:') : raw;
    for (const match of content.matchAll(/!\[([^\]]*)\]\(<?([^\s)>]+)>?(?:\s+"[^"]*")?\)/g)) {
      if (/logo|avatar|icon|badge|tracking|pixel|로고|아이콘|프로필/i.test(match[1] + ' ' + match[2])) continue;
      const url = safeImageUrl(match[2], base);
      if (url) return url;
    }
    return '';
  }

  function htmlImage(html, base) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    for (const img of doc.querySelectorAll('img')) {
      if (/logo|avatar|icon|로고|아이콘|프로필/i.test(img.getAttribute('alt') || '')) continue;
      if ((img.hasAttribute('width') && Number(img.getAttribute('width')) < 80) || (img.hasAttribute('height') && Number(img.getAttribute('height')) < 50)) continue;
      const url = safeImageUrl(img.getAttribute('data-src') || img.getAttribute('src'), base);
      if (url) return url;
    }
    return '';
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

  function visibleTitle(value) {
    return String(value || '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function markdownTitle(raw) {
    const marker = 'Markdown Content:';
    const markdown = raw.includes(marker) ? raw.split(marker).slice(1).join(marker) : raw;
    const headings = [...markdown.matchAll(/^#{1,3}\s+(.+)$/gm)].map(match => visibleTitle(match[1])).filter(Boolean);
    const index = headings.findIndex(title => title.length >= 5 && title.length <= 100 && /\p{L}/u.test(title) && !/^(?:copyright|all rights reserved)$/i.test(title));
    if (index < 0) return '';
    return /^\d{4}$/.test(headings[index - 1] || '') ? `${headings[index - 1]} ${headings[index]}` : headings[index];
  }

  function parseReaderText(raw, fallbackUrl) {
    if (/^Warning:.*(?:error [45]\d\d|captcha)/im.test(raw) || /^Title:.*(?:접근 제한|access denied|just a moment|captcha)/im.test(raw)) {
      throw new Error('원문 사이트가 자동 읽기를 제한했어요. 본문을 직접 붙여 넣을 수 있어요.');
    }
    const title = visibleTitle(raw.match(/^Title:\s*(.*)$/m)?.[1]) || markdownTitle(raw) || new URL(fallbackUrl).hostname;
    const published = raw.match(/^Published Time:\s*(.+)$/m)?.[1]?.trim() || '';
    const marker = 'Markdown Content:';
    const content = cleanMarkdown(raw.includes(marker) ? raw.split(marker).slice(1).join(marker) : raw);
    if (content.length < 80) throw new Error('본문이 충분하지 않습니다.');
    return { title, published, content, thumbnailUrl: readerImage(raw, fallbackUrl) };
  }

  function youtubeVideoId(value) {
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      let id = '';
      if (host === 'youtu.be') id = url.pathname.slice(1).split('/')[0];
      else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
        id = url.pathname === '/watch' ? url.searchParams.get('v') : url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1];
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id || '') ? id : '';
    } catch { return ''; }
  }

  function youtubeTranscriptUrls(videoId) {
    const urls = [];
    if (typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) {
      urls.push(new URL(`/api/youtube-transcript?id=${encodeURIComponent(videoId)}`, location.origin).href);
    }
    urls.push(`https://youtube-transcript.ai/transcript/${videoId}.txt`);
    return [...new Set(urls)];
  }

  // Some automatic captions repeat the same phrase in adjacent cues. Remove only
  // immediately duplicated word runs; keep timestamps and the original order.
  function removeAdjacentCaptionRepeats(line) {
    const words = line.split(/\s+/);
    for (let i = 1; i < words.length;) {
      let repeated = 0;
      for (let size = Math.min(20, i, words.length - i); size >= 2; size--) {
        if (words.slice(i - size, i).join(' ') === words.slice(i, i + size).join(' ')) { repeated = size; break; }
      }
      if (repeated) words.splice(i, repeated);
      else i++;
    }
    return words.join(' ');
  }

  function parseYoutubeTranscript(raw, videoId) {
    const title = raw.match(/^# Transcript:\s*(.+)$/m)?.[1]?.trim();
    const source = raw.match(/^Source video:\s*(.+)$/m)?.[1]?.trim();
    const marker = raw.indexOf('## Transcript');
    if (!title || youtubeVideoId(source) !== videoId || marker < 0) throw new Error('영상 스크립트를 확인하지 못했어요. 스크립트를 직접 붙여 넣어 주세요.');
    const language = raw.match(/^Language:\s*([^\n]+)/m)?.[1]?.trim() || '';
    const content = raw.slice(marker + '## Transcript'.length).trim().split(/\n+/)
      .map(line => removeAdjacentCaptionRepeats(line.trim())).filter(Boolean).join('\n');
    if (content.length < 80) throw new Error('영상 스크립트가 비어 있거나 너무 짧아요. 직접 붙여 넣어 주세요.');
    return {title, published:'', content, thumbnailUrl:'', method:'youtube-transcript', transcriptLanguage:language};
  }

  async function fetchYoutubeTranscript(url, signal) {
    const id = youtubeVideoId(url);
    if (!id) throw new Error('유효한 유튜브 영상 주소가 아니에요.');
    let lastError;
    for (const endpoint of youtubeTranscriptUrls(id)) {
      try {
        const response = await fetch(endpoint, {signal, credentials:'omit', headers:{Accept:'text/markdown'}});
        if (!response.ok) { lastError = new Error(`스크립트 요청 실패 (${response.status})`); continue; }
        try { return parseYoutubeTranscript(await response.text(), id); }
        catch (error) { lastError = error; }
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    throw new Error('영상 페이지 읽기가 제한되어 공개 스크립트 경로도 확인했지만 가져오지 못했어요. 유튜브에서 스크립트를 복사해 붙여 넣어 주세요.', {cause:lastError});
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
    if (!sentences.length) return {summary:'본문은 저장했지만 핵심 문장을 자동으로 고르지 못했어요.',points:[],quote:'',evidence:[]};
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

  // This blog publishes this JSON link in each article's HTML. Use its public
  // content API, not a reader proxy that the publisher rejects.
  function publisherUrl(value) {
    const url = new URL(value);
    const match = url.pathname.match(/^\/(\d+)\/?$/);
    return url.hostname === 'techblog.woowahan.com' && match
      ? `https://techblog.woowahan.com/wp-json/wp/v2/posts/${match[1]}` : '';
  }

  function htmlText(html) {
    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('script,style,noscript,iframe,form').forEach(node => node.remove());
    doc.querySelectorAll('p,div,section,h1,h2,h3,h4,li,br,blockquote,pre').forEach(node => node.append('\n'));
    return (doc.body.textContent || '').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  }

  async function fetchArticle(url, signal) {
    if (youtubeVideoId(url)) return fetchYoutubeTranscript(url, signal);
    const endpoint = publisherUrl(url);
    if (endpoint) {
      const response = await fetch(endpoint, {signal, credentials:'omit', headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('블로그 본문을 가져오지 못했어요. 잠시 후 다시 시도하거나 본문을 붙여 넣어 주세요.');
      const data = await response.json();
      if (data.status !== 'publish' || data.content?.protected) throw new Error('공개된 본문만 읽을 수 있어요.');
      const content = htmlText(data.content?.rendered);
      if (!content) throw new Error('본문이 비어 있어요.');
      return {title:htmlText(data.title?.rendered),published:data.date || '',content,thumbnailUrl:htmlImage(data.content?.rendered,url),method:'publisher'};
    }
    if (new URL(url).hostname === 'techblog.musinsa.com' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol)) {
      try {
        const response = await fetch(new URL(`/api/article-reader?url=${encodeURIComponent(url)}`, location.origin), {signal, credentials:'omit', headers:{Accept:'application/json'}});
        if (response.ok) {
          const data = await response.json();
          const content = htmlText(data.contentHtml);
          if (data.title && content.length >= 80) return {title:htmlText(data.title), published:data.published || '', content, thumbnailUrl:htmlImage(data.contentHtml,url), method:'publisher-feed'};
        }
      } catch (error) { if (signal?.aborted) throw error; }
    }
    const response = await fetch(`https://r.jina.ai/${url}`, {signal, credentials:'omit',headers:{Accept:'text/plain'}});
    if (!response.ok) throw new Error(`자동 읽기 요청에 실패했어요 (${response.status}). 본문을 직접 붙여 넣을 수 있어요.`);
    return {...parseReaderText(await response.text(),url),method:'reader'};
  }

  return {
    fetchArticle,
    safeImageUrl,
    readerImage,
    htmlImage,
    publisherUrl,
    htmlText,
    validateHttpUrl,
    parseReaderText,
    summarize,
    youtubeVideoId,
    youtubeTranscriptUrls,
    parseYoutubeTranscript,
    fetchYoutubeTranscript,
    readerUrl: url => `https://r.jina.ai/${url}`
  };
});
