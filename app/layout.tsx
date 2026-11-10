import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "노동 FAQ 챗봇 (비공식)",
  description: "고용노동부 자주하는 질문을 바탕으로 답하는 비공식 토이 프로젝트 챗봇",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
