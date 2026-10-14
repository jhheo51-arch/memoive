const assert = require('node:assert/strict');
const LinkReader = require('../frontend/js/link-reader.js');

// Synthetic reader responses; no network requests.
const reader = body => `Title: Instagram\nURL Source: https://www.instagram.com/x/\nMarkdown Content:\n${body}`;
const wall = 'See everyday moments from your close friends. Log into Instagram. Mobile number, username or email. Password. Log in. Forgot password? Log in with Facebook. Create new account. Meta';

assert.throws(() => LinkReader.parseReaderText(reader(wall), 'https://www.instagram.com/instagram/'), /로그인이 필요한 페이지/, 'an Instagram sign-in page is not saved as the post');
assert.throws(() => LinkReader.parseReaderText(reader(wall), 'https://m.facebook.com/somepage'), /로그인이 필요한 페이지/);
assert.throws(() => LinkReader.parseReaderText(reader('Threads 로그인. 사용자 이름 또는 이메일, 비밀번호를 입력하세요. Instagram으로 계속하기. 계정이 없으신가요? 가입하기. '.repeat(2)), 'https://www.threads.net/@someone'), /로그인이 필요한 페이지/);

const caption = '오늘 성수 매장에서 본 진열 방식이 인상적이었다. 고객이 직접 만져볼 수 있게 동선을 짰고, 계산대 앞의 대기 시간을 줄이는 작은 장치가 있었다. '.repeat(3);
assert.equal(LinkReader.parseReaderText(reader(caption), 'https://www.instagram.com/p/abc/').content.length > 80, true, 'real caption text from a social site is kept');
const articleWithLogin = '로그인 없이 읽을 수 있는 공개 글입니다. 비밀번호 관리 습관에 대한 기사로, 새 계정을 만들 때 주의할 점을 설명합니다. '.repeat(3);
assert.ok(LinkReader.parseReaderText(reader(articleWithLogin), 'https://news.example.com/password-tips').content, 'login words on other sites do not block reading');
assert.equal(LinkReader.loginWall('not a url', wall), false);
assert.equal(LinkReader.loginWall('https://www.instagram.com/x/', wall + ' 본문'.repeat(800)), false, 'long pages are not treated as sign-in walls');

console.log('PASS: Instagram, Facebook and Threads sign-in pages fall back to manual paste; captions and other sites are read normally. Synthetic text only.');
