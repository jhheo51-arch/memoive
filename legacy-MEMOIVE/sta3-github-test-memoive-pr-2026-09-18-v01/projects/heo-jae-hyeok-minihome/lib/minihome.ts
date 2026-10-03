export type GuestbookEntry = { id: number; nickname: string; message: string; createdAt: number };
export type DiaryEntry = { id: number; title: string; content: string; imageKey: string | null; createdAt: number };
export type SiteSettings = { interestTitle: string; interestTags: string; youtubeUrl: string };
export type VisitStat = { dateKey: string; count: number };
export type NoticeType = 'success' | 'error' | '';
export type DeleteTarget = { type: 'diary' | 'guestbook'; id: number; label: string } | null;

type ApiResponse<T> = {
  entries?: T[];
  entry?: T;
  message?: string;
  isAdmin?: boolean;
  saved?: boolean;
  settings?: SiteSettings;
  stats?: VisitStat[];
  deletedId?: number;
};

export const defaultSettings: SiteSettings = {
  interestTitle: '사람과 AI가 함께 일하는 방법',
  interestTags: '#에이전트 #기록 #실험',
  youtubeUrl: '',
};

export function getYoutubeVideoId(value: string) {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return '';
    let videoId = '';
    if (['youtu.be', 'www.youtu.be'].includes(url.hostname)) {
      videoId = /^\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] || '';
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com'].includes(url.hostname)) {
      videoId = url.pathname === '/watch'
        ? (url.searchParams.getAll('v').length === 1 ? url.searchParams.get('v') || '' : '')
        : /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/.exec(url.pathname)?.[1] || '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : '';
  } catch {
    return '';
  }
}

export async function readJson<T>(response: Response) {
  const data = (await response.json()) as ApiResponse<T>;
  if (!response.ok) throw new Error(data.message || '요청을 처리하지 못했습니다.');
  return data;
}

export async function postGuestbook(nickname: string, message: string) {
  const data = await readJson<GuestbookEntry>(await fetch('/api/guestbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, message }),
  }));
  if (!data.entry) throw new Error('저장된 글을 확인하지 못했습니다.');
  return data.entry;
}

export async function sendDiary(
  method: 'POST' | 'PATCH',
  title: string,
  content: string,
  image?: File | null,
  id?: number,
) {
  const formData = new FormData();
  formData.set('title', title);
  formData.set('content', content);
  if (image) formData.set('image', image);
  if (id) formData.set('id', String(id));
  const data = await readJson<DiaryEntry>(await fetch('/api/diary', { method, body: formData }));
  if (!data.entry) throw new Error('저장된 일기를 확인하지 못했습니다.');
  return data.entry;
}

export function formatDiaryDate(timestamp: number) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: '2-digit' }).format(timestamp);
}
