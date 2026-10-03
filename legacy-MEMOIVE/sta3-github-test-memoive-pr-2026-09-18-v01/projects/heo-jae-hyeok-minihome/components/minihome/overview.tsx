import { CSSProperties } from 'react';
import type { VisitStat } from '@/lib/minihome';

export function SiteHeader({ quote, totalVisits }: { quote: string; totalVisits: number }) {
  return <>
    <header className="topbar">
      <div className="window-dots" aria-hidden="true"><span /><span /><span /></div>
      <span className="site-name"><b>HEO</b><i>/</i> ALPINE LOG</span>
      <p>7 DAYS <strong>{totalVisits}</strong> VISITORS</p>
    </header>
    <div className="quote-bar" aria-label="오늘의 명언">
      <span>오늘의 문장</span><q>{quote}</q>
      <time>{new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}</time>
    </div>
  </>;
}

export function ProfilePanel() {
  return <section className="profile-panel">
    <div className="avatar" aria-label="허재혁 프로필 이미지 자리"><span>HJH</span></div>
    <p className="eyebrow">OWNER</p>
    <h1>허재혁</h1>
    <p className="english-name">Heo Jae Hyeok</p>
    <p className="profile-intro">자기소개와 활동 기록을 한곳에 차곡차곡 남깁니다.</p>
    <p className="online"><span /> ONLINE</p>
  </section>;
}

export function VisitStatsPanel({ stats }: { stats: VisitStat[] }) {
  const maxVisit = Math.max(1, ...stats.map((item) => item.count));
  const totalVisits = stats.reduce((sum, item) => sum + item.count, 0);
  return <section className="stats-panel" aria-labelledby="stats-title">
    <div className="stats-heading">
      <div><p className="eyebrow">VISIT TREND</p><h2 id="stats-title">최근 7일 방문자</h2></div>
      <strong>{totalVisits}명</strong>
    </div>
    <figure className="visit-chart">
      <figcaption className="sr-only">최근 7일 방문자 합계 {totalVisits}명</figcaption>
      {stats.map((item) => <div className="visit-column" key={item.dateKey} title={`${item.dateKey} ${item.count}명`}>
        <span>{item.count}</span><div><i style={{ height: `${Math.max(5, (item.count / maxVisit) * 100)}%` }} /></div>
        <small>{item.dateKey.slice(5).replace('-', '.')}</small>
      </div>)}
    </figure>
    <p className="stats-note">같은 브라우저는 하루 한 번 집계합니다.</p>
  </section>;
}

export function HeroCard({ dayNumber, image }: { dayNumber: number; image: string }) {
  return <section className="hero-card" style={{ '--hero-image': `url(${image})` } as CSSProperties} aria-labelledby="hero-title">
    <div className="hero-overlay" />
    <div className="hero-copy">
      <p>✦ 오늘의 풍경 · {dayNumber % 7 + 1}/7</p>
      <h2 id="hero-title">작은 시도가<br />나만의 길을 만든다.</h2>
      <span>알프스 풍경은 하루마다 바뀝니다.</span>
    </div>
  </section>;
}
