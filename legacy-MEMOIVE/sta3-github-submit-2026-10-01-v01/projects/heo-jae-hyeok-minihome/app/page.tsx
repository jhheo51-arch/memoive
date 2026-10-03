'use client';

import Image from 'next/image';
import { ChangeEvent, SubmitEvent, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HeroCard, ProfilePanel, SiteHeader, VisitStatsPanel } from '@/components/minihome/overview';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { alpsImages, dailyQuotes, getKstDayNumber } from '@/lib/daily-content';
import {
  defaultSettings,
  formatDiaryDate,
  getYoutubeVideoId,
  postGuestbook,
  readJson,
  sendDiary,
  type DeleteTarget,
  type DiaryEntry,
  type GuestbookEntry,
  type NoticeType,
  type VisitStat,
} from '@/lib/minihome';
type ModelContext = {
  registerTool: (tool: {
    name: string; title: string; description: string; inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => Promise<unknown>;
  }, options: { signal: AbortSignal }) => void | Promise<void>;
};

export default function Home() {
  const dayNumber = useMemo(() => getKstDayNumber(), []);
  const dailyImage = alpsImages[dayNumber % alpsImages.length];
  const dailyQuote = dailyQuotes[dayNumber % dailyQuotes.length];
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntry[]>([]);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [visitStats, setVisitStats] = useState<VisitStat[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminNotice, setAdminNotice] = useState('');
  const [adminNoticeType, setAdminNoticeType] = useState<NoticeType>('');
  const [nickname, setNickname] = useState('');
  const [guestMessage, setGuestMessage] = useState('');
  const [guestNotice, setGuestNotice] = useState('');
  const [guestNoticeType, setGuestNoticeType] = useState<NoticeType>('');
  const [diaryTitle, setDiaryTitle] = useState('');
  const [diaryContent, setDiaryContent] = useState('');
  const [diaryImage, setDiaryImage] = useState<File | null>(null);
  const [diaryNotice, setDiaryNotice] = useState('');
  const [diaryNoticeType, setDiaryNoticeType] = useState<NoticeType>('');
  const [interestTitle, setInterestTitle] = useState(defaultSettings.interestTitle);
  const [interestTags, setInterestTags] = useState(defaultSettings.interestTags);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [playlistNotice, setPlaylistNotice] = useState('');
  const [playlistNoticeType, setPlaylistNoticeType] = useState<NoticeType>('');
  const [editingDiaryId, setEditingDiaryId] = useState<number | null>(null);
  const [editingGuestbookId, setEditingGuestbookId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editDiaryImage, setEditDiaryImage] = useState<File | null>(null);
  const [editNickname, setEditNickname] = useState('');
  const [editMessage, setEditMessage] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch('/api/guestbook', { cache: 'no-store' }).then(readJson<GuestbookEntry>),
      fetch('/api/diary', { cache: 'no-store' }).then(readJson<DiaryEntry>),
      fetch('/api/settings', { cache: 'no-store' }).then(readJson<never>),
      fetch('/api/admin/session', { cache: 'no-store' }).then(readJson<never>),
      fetch('/api/stats', { method: 'POST' }).then(readJson<never>),
    ]).then(([guestData, diaryData, settingsData, sessionData, statsData]) => {
      if (!active) return;
      setGuestbookEntries(guestData.entries || []);
      setDiaryEntries(diaryData.entries || []);
      const nextSettings = settingsData.settings || defaultSettings;
      setSettings(nextSettings); setInterestTitle(nextSettings.interestTitle); setInterestTags(nextSettings.interestTags); setYoutubeUrl(nextSettings.youtubeUrl || '');
      setIsAdmin(Boolean(sessionData.isAdmin)); setVisitStats(statsData.stats || []);
    }).catch((error: Error) => {
      if (active) { setGuestNotice(error.message); setGuestNoticeType('error'); }
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'create_guestbook_entry', title: '방명록 글 작성', description: '닉네임과 메시지로 공개 방명록 글을 작성하고 최신순 목록에 추가합니다.',
      inputSchema: { type: 'object', properties: { nickname: { type: 'string', minLength: 1, maxLength: 20 }, message: { type: 'string', minLength: 1, maxLength: 200 } }, required: ['nickname', 'message'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      async execute(input) {
        const values = input as { nickname?: unknown; message?: unknown };
        const name = typeof values.nickname === 'string' ? values.nickname.trim() : '';
        const message = typeof values.message === 'string' ? values.message.trim() : '';
        if (!name || !message) throw new Error('닉네임과 메시지는 필수입니다.');
        if (name.length > 20 || message.length > 200) throw new Error('글자 수 제한을 확인해 주세요.');
        const entry = await postGuestbook(name, message);
        setGuestbookEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
        return { id: entry.id, nickname: entry.nickname, saved: true };
      },
    }, { signal: lifecycle.signal })).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  function setNotice(error: unknown, setter: (value: string) => void, typeSetter: (value: NoticeType) => void) {
    setter(error instanceof Error ? error.message : '요청을 처리하지 못했습니다.'); typeSetter('error');
  }

  async function login(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSubmitting(true); setAdminNotice('');
    try {
      const data = await readJson<never>(await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: adminPassword }) }));
      setIsAdmin(Boolean(data.isAdmin)); setAdminPassword(''); setAdminNotice('관리자 수정 기능이 열렸습니다.'); setAdminNoticeType('success');
    } catch (error) { setIsAdmin(false); setAdminNotice(error instanceof Error ? error.message : '허재혁님만 접근이 가능합니다'); setAdminNoticeType('error'); }
    finally { setIsSubmitting(false); }
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }); setIsAdmin(false); setAdminNotice('관리자 모드를 종료했습니다.'); setAdminNoticeType('success');
    setEditingDiaryId(null); setEditingGuestbookId(null);
  }

  async function changePassword(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { setAdminNotice('새 비밀번호가 서로 다릅니다.'); setAdminNoticeType('error'); return; }
    setIsSubmitting(true);
    try {
      await readJson<never>(await fetch('/api/admin/password', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: newPassword }) }));
      setNewPassword(''); setConfirmPassword(''); setAdminNotice('비밀번호가 변경되었습니다.'); setAdminNoticeType('success');
    } catch (error) { setNotice(error, setAdminNotice, setAdminNoticeType); }
    finally { setIsSubmitting(false); }
  }

  async function saveInterest(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSubmitting(true);
    try {
      const data = await readJson<never>(await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ interestTitle, interestTags }) }));
      if (data.settings) setSettings(data.settings);
      setAdminNotice('관심사가 수정되었습니다.'); setAdminNoticeType('success');
    } catch (error) { setNotice(error, setAdminNotice, setAdminNoticeType); }
    finally { setIsSubmitting(false); }
  }

  async function savePlaylist(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); setIsSubmitting(true); setPlaylistNotice('');
    try {
      const data = await readJson<never>(await fetch('/api/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ youtubeUrl }) }));
      if (data.settings) { setSettings(data.settings); setYoutubeUrl(data.settings.youtubeUrl); }
      setPlaylistNotice('플레이리스트 음악이 변경되었습니다.'); setPlaylistNoticeType('success');
    } catch (error) { setNotice(error, setPlaylistNotice, setPlaylistNoticeType); }
    finally { setIsSubmitting(false); }
  }

  async function createGuestbook(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const name = nickname.trim(); const message = guestMessage.trim();
    if (!name || !message) { setGuestNotice('닉네임과 메시지를 모두 입력해 주세요.'); setGuestNoticeType('error'); return; }
    setIsSubmitting(true);
    try {
      const entry = await postGuestbook(name, message);
      setGuestbookEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setNickname(''); setGuestMessage(''); setGuestNotice('방명록 글이 등록되었습니다.'); setGuestNoticeType('success');
    } catch (error) { setNotice(error, setGuestNotice, setGuestNoticeType); }
    finally { setIsSubmitting(false); }
  }

  async function createDiary(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); const title = diaryTitle.trim(); const content = diaryContent.trim();
    if (!title || !content) { setDiaryNotice('제목과 내용을 모두 입력해 주세요.'); setDiaryNoticeType('error'); return; }
    setIsSubmitting(true);
    try {
      const entry = await sendDiary('POST', title, content, diaryImage);
      setDiaryEntries((current) => [entry, ...current]); setDiaryTitle(''); setDiaryContent(''); setDiaryImage(null);
      const input = document.getElementById('diary-image') as HTMLInputElement | null; if (input) input.value = '';
      setDiaryNotice('새 일기가 등록되었습니다.'); setDiaryNoticeType('success');
    } catch (error) { setNotice(error, setDiaryNotice, setDiaryNoticeType); }
    finally { setIsSubmitting(false); }
  }

  async function updateDiary(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingDiaryId) return; setIsSubmitting(true);
    try {
      const entry = await sendDiary('PATCH', editTitle.trim(), editContent.trim(), editDiaryImage, editingDiaryId);
      setDiaryEntries((current) => current.map((item) => item.id === entry.id ? entry : item)); setEditingDiaryId(null); setEditDiaryImage(null);
      setDiaryNotice('일기가 수정되었습니다.'); setDiaryNoticeType('success');
    } catch (error) { setNotice(error, setDiaryNotice, setDiaryNoticeType); }
    finally { setIsSubmitting(false); }
  }

  async function updateGuestbook(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingGuestbookId) return; setIsSubmitting(true);
    try {
      const data = await readJson<GuestbookEntry>(await fetch('/api/guestbook', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingGuestbookId, nickname: editNickname, message: editMessage }) }));
      if (data.entry) setGuestbookEntries((current) => current.map((item) => item.id === data.entry?.id ? data.entry : item));
      setEditingGuestbookId(null); setGuestNotice('방명록 글이 수정되었습니다.'); setGuestNoticeType('success');
    } catch (error) { setNotice(error, setGuestNotice, setGuestNoticeType); }
    finally { setIsSubmitting(false); }
  }

  async function deleteEntry() {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    const target = deleteTarget;
    try {
      await readJson<never>(await fetch(`/api/${target.type}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: target.id }) }));
      if (target.type === 'diary') {
        setDiaryEntries((current) => current.filter((item) => item.id !== target.id));
        setDiaryNotice('일기가 삭제되었습니다.'); setDiaryNoticeType('success'); setEditingDiaryId(null);
      } else {
        setGuestbookEntries((current) => current.filter((item) => item.id !== target.id));
        setGuestNotice('방명록 글이 삭제되었습니다.'); setGuestNoticeType('success'); setEditingGuestbookId(null);
      }
      setDeleteTarget(null);
    } catch (error) {
      if (target.type === 'diary') setNotice(error, setDiaryNotice, setDiaryNoticeType);
      else setNotice(error, setGuestNotice, setGuestNoticeType);
    } finally { setIsSubmitting(false); }
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) {
    const image = event.target.files?.[0] || null;
    if (image && image.size > 5 * 1024 * 1024) { setDiaryNotice('사진은 5MB 이하로 첨부해 주세요.'); setDiaryNoticeType('error'); event.target.value = ''; setter(null); return; }
    setter(image);
  }

  const totalVisits = visitStats.reduce((sum, item) => sum + item.count, 0);
  const youtubeVideoId = getYoutubeVideoId(settings.youtubeUrl);

  return (
    <main>
      <div className="sky-glow" aria-hidden="true" />
      <div className="browser-shell">
        <SiteHeader quote={dailyQuote} totalVisits={totalVisits} />
        <div className="site-body" id="home">
          <aside className="left-column">
            <ProfilePanel />
            <VisitStatsPanel stats={visitStats} />
            <section className={`admin-panel ${isAdmin ? 'active' : ''}`} id="admin-panel"><button className="admin-toggle" type="button" aria-expanded={adminOpen} aria-controls="admin-panel-content" onClick={() => setAdminOpen((open) => !open)}><span>{isAdmin ? '●' : '○'}</span> 관리자 바 <b>{adminOpen ? '−' : '+'}</b></button>{adminOpen && <div id="admin-panel-content">{!isAdmin ? <form className="admin-form" onSubmit={login}><label htmlFor="admin-password">관리자 비밀번호</label><Input id="admin-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" required /><Button type="submit" disabled={isSubmitting}>접속하기</Button></form> : <div className="admin-tools"><p>관리자 수정 기능 사용 중</p><form className="admin-form" onSubmit={changePassword}><label htmlFor="new-password">새 비밀번호</label><Input id="new-password" type="password" minLength={6} maxLength={64} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /><label htmlFor="confirm-password">새 비밀번호 확인</label><Input id="confirm-password" type="password" minLength={6} maxLength={64} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /><Button type="submit" disabled={isSubmitting}>비밀번호 변경</Button></form><button type="button" className="logout-button" onClick={logout}>관리자 모드 종료</button></div>}</div>}<output className={`form-notice ${adminNoticeType}`} aria-live="polite">{adminNotice}</output></section>
          </aside>
          <div className="right-column">
            <HeroCard dayNumber={dayNumber} image={dailyImage} />
            <section className="interest-row">
              <article className="interest-card"><p>요즘의 관심사</p>{isAdmin ? <form className="interest-form" onSubmit={saveInterest}><Input value={interestTitle} onChange={(event) => setInterestTitle(event.target.value)} maxLength={60} aria-label="요즘의 관심사" required /><Input value={interestTags} onChange={(event) => setInterestTags(event.target.value)} maxLength={80} aria-label="관심사 태그" required /><Button type="submit" disabled={isSubmitting}>관심사 저장</Button></form> : <><h3>{settings.interestTitle}</h3><span>{settings.interestTags}</span></>}</article>
              <article className={`playlist-card ${youtubeVideoId ? 'has-video' : ''}`}>
                {youtubeVideoId ? <iframe src={`https://www.youtube-nocookie.com/embed/${youtubeVideoId}`} title="허재혁의 현재 플레이리스트" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <><div className="record"><span>HJH</span></div><div><p>NOW PLAYING</p><h3>Heo&apos;s YouTube Pick</h3><span>관리자 모드에서 음악 링크를 연결해 주세요.</span></div><span className="play-icon" aria-hidden="true">▶</span></>}
                {isAdmin && <form className="playlist-form" onSubmit={savePlaylist}><label htmlFor="youtube-url">유튜브 영상 링크</label><div><Input id="youtube-url" type="url" value={youtubeUrl} onChange={(event) => setYoutubeUrl(event.target.value)} maxLength={300} placeholder="https://youtu.be/..." required /><Button type="submit" disabled={isSubmitting}>음악 변경</Button></div><output className={`form-notice ${playlistNoticeType}`} aria-live="polite">{playlistNotice}</output></form>}
              </article>
            </section>
            <section className="diary-section" id="diary" aria-labelledby="diary-title">
              <div className="section-heading"><div><p className="eyebrow">RECENT NOTES</p><h2 id="diary-title">다이어리</h2></div><span>{diaryEntries.length}개의 이야기</span></div>
              {isAdmin && <form className="entry-form" onSubmit={createDiary}><div className="field-row"><label htmlFor="diary-title-input">새 일기 제목 <b>*</b></label><span>{diaryTitle.length} / 20</span></div><Input id="diary-title-input" value={diaryTitle} onChange={(event) => setDiaryTitle(event.target.value)} maxLength={20} required /><div className="field-row"><label htmlFor="diary-content">내용 <b>*</b></label><span>{diaryContent.length} / 200</span></div><Textarea id="diary-content" value={diaryContent} onChange={(event) => setDiaryContent(event.target.value)} maxLength={200} rows={4} required /><div className="upload-row"><label htmlFor="diary-image">▧ 사진 첨부 <small>JPG·PNG·WEBP, 최대 5MB</small></label><Input id="diary-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event, setDiaryImage)} /><Button type="submit" disabled={isSubmitting}>일기 등록</Button></div></form>}
              <output className={`form-notice ${diaryNoticeType}`} aria-live="polite">{diaryNotice}</output>
              <div className="diary-list" aria-busy={isLoading}>{isLoading ? <p className="loading-copy">다이어리를 불러오고 있어요.</p> : diaryEntries.length === 0 ? <p className="loading-copy">관리자 모드에서 첫 기록을 남겨보세요.</p> : diaryEntries.map((entry) => <article className="diary-entry" key={entry.id}>{editingDiaryId === entry.id ? <form className="inline-editor" onSubmit={updateDiary}><Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} maxLength={20} required /><Textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} maxLength={200} required /><Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event, setEditDiaryImage)} /><div><Button type="submit" disabled={isSubmitting}>저장</Button><button type="button" onClick={() => setEditingDiaryId(null)}>취소</button></div></form> : <><time>{formatDiaryDate(entry.createdAt)}</time><div className="diary-copy"><h3>{entry.title}</h3><p>{entry.content}</p>{isAdmin && <div className="entry-actions"><button className="edit-button" type="button" onClick={() => { setEditingDiaryId(entry.id); setEditTitle(entry.title); setEditContent(entry.content); }}>수정</button><button className="delete-button" type="button" onClick={() => setDeleteTarget({ type: 'diary', id: entry.id, label: entry.title })}>삭제</button></div>}</div>{entry.imageKey && <Image unoptimized width={320} height={200} src={`/api/diary/image?key=${encodeURIComponent(entry.imageKey)}`} alt={`${entry.title}에 첨부된 사진`} />}</>}</article>)}</div>
            </section>
            <section className="guestbook-section" id="guestbook" aria-labelledby="guestbook-title">
              <div className="section-heading"><div><p className="eyebrow">GUESTBOOK</p><h2 id="guestbook-title">잠깐 들른 흔적</h2></div><span>최근 글이 위에 보여요</span></div>
              <form className="guestbook-form" onSubmit={createGuestbook}><div><div className="field-row"><label htmlFor="nickname">닉네임 <b>*</b></label><span>{nickname.length} / 20</span></div><Input id="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={20} required /></div><div><div className="field-row"><label htmlFor="guest-message">메시지 <b>*</b></label><span>{guestMessage.length} / 200</span></div><Textarea id="guest-message" value={guestMessage} onChange={(event) => setGuestMessage(event.target.value)} maxLength={200} required rows={3} /></div><Button type="submit" disabled={isSubmitting}>방명록 남기기</Button><output className={`form-notice ${guestNoticeType}`} aria-live="polite">{guestNotice}</output></form>
              <div className="guestbook-list" aria-busy={isLoading}>{isLoading ? <p className="loading-copy">방명록을 불러오고 있어요.</p> : <ol>{guestbookEntries.map((entry, index) => <li key={entry.id}>{editingGuestbookId === entry.id ? <form className="inline-editor" onSubmit={updateGuestbook}><Input value={editNickname} onChange={(event) => setEditNickname(event.target.value)} maxLength={20} required /><Textarea value={editMessage} onChange={(event) => setEditMessage(event.target.value)} maxLength={200} required /><div><Button type="submit" disabled={isSubmitting}>저장</Button><button type="button" onClick={() => setEditingGuestbookId(null)}>취소</button></div></form> : <><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{entry.nickname}</strong><p>{entry.message}</p>{isAdmin && <div className="entry-actions"><button className="edit-button" type="button" onClick={() => { setEditingGuestbookId(entry.id); setEditNickname(entry.nickname); setEditMessage(entry.message); }}>수정</button><button className="delete-button" type="button" onClick={() => setDeleteTarget({ type: 'guestbook', id: entry.id, label: `${entry.nickname}님의 글` })}>삭제</button></div>}</div></>}</li>)}</ol>}</div>
            </section>
          </div>
        </div>
        <footer>© 2026 HEO JAE HYEOK <span>made with curiosity ✦</span></footer>
      </div>
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>정말 삭제할까요?</AlertDialogTitle><AlertDialogDescription>“{deleteTarget?.label}”을 삭제하면 되돌릴 수 없습니다.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel><AlertDialogAction className="confirm-delete" disabled={isSubmitting} onClick={deleteEntry}>삭제하기</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
