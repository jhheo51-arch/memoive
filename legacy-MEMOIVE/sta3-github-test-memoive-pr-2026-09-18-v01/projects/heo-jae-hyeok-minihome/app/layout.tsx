import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '허재혁의 미니홈피',
  description: '허재혁의 자기소개와 활동 기록을 담은 개인 미니홈피',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
