import { getYoutubeVideoId } from '../lib/minihome.ts';

const cases = new Map([
  ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['not-a-url', ''],
  ['  https://youtu.be/dQw4w9WgXcQ?si=shared  ', 'dQw4w9WgXcQ'],
  ['http://youtube.com/watch?v=dQw4w9WgXcQ&t=30', 'dQw4w9WgXcQ'],
  ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=playlist', 'dQw4w9WgXcQ'],
  ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['https://youtube.com/live/dQw4w9WgXcQ/', 'dQw4w9WgXcQ'],
  ['https://youtu.be/dQw4w9WgXcQ/', 'dQw4w9WgXcQ'],
  ['https://www.youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ['HTTPS://WWW.YOUTUBE.COM/watch?v=Abcdef12_-3', 'Abcdef12_-3'],
  ['', ''],
  ['https://youtube.com/watch', ''],
  ['https://youtube.com/watch?v=', ''],
  ['https://youtube.com/watch?v=1234567890', ''],
  ['https://youtube.com/watch?v=123456789012', ''],
  ['https://youtube.com/watch?v=1234567890!', ''],
  ['https://youtube.com/watch?v=dQw4w9WgXcQ&v=Abcdef12_-3', ''],
  ['https://youtube.com/watch?v=dQw4w9WgXcQ&v=dQw4w9WgXcQ', ''],
  ['https://youtu.be/dQw4w9WgXcQ/extra', ''],
  ['https://youtube.com/shorts/dQw4w9WgXcQ/extra', ''],
  ['https://youtube.com/embed/dQw4w9WgXcQ/extra', ''],
  ['https://youtube.com/live/dQw4w9WgXcQ/extra', ''],
  ['https://youtube.com/playlist?list=dQw4w9WgXcQ', ''],
  ['https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ', ''],
  ['https://evil.example/youtu.be/dQw4w9WgXcQ', ''],
  ['https://www.m.youtube.com/watch?v=dQw4w9WgXcQ', ''],
  ['https://user:password@youtube.com/watch?v=dQw4w9WgXcQ', ''],
  ['https://youtube.com@evil.example/watch?v=dQw4w9WgXcQ', ''],
  ['ftp://youtube.com/watch?v=dQw4w9WgXcQ', ''],
  ['javascript:alert(1)', ''],
  ['//youtube.com/watch?v=dQw4w9WgXcQ', ''],
  ['https://youtube.com:8443/watch?v=dQw4w9WgXcQ', ''],
  ['https://youtu.be//dQw4w9WgXcQ', ''],
  ['https://youtube.com/watch/extra?v=dQw4w9WgXcQ', ''],
]);

for (const [input, expected] of cases) {
  const actual = getYoutubeVideoId(input);
  if (actual !== expected) throw new Error(`${input}: expected ${expected}, received ${actual}`);
}

console.log(`refactor self-check passed (${cases.size} cases)`);
