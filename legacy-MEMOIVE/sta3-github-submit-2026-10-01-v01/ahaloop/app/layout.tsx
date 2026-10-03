import type { Metadata } from "next";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "아하루프 | 놓친 혜택을 받을 때까지",
  description: "생활 조건을 바탕으로 받을 가능성이 높은 혜택을 찾고 준비부터 수령까지 이어 주는 혜택 회수 서비스",
  other: { "codex-preview": "development" },
  icons: { icon: "/brand/ahaloop-mascot-profile.png", shortcut: "/brand/ahaloop-mascot-profile.png", apple: "/brand/ahaloop-mascot-profile.png" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireChatGPTUser("/");
  return <html lang="ko"><body className="antialiased">{children}</body></html>;
}
