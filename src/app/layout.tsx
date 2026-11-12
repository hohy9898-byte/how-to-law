import type { Metadata } from "next";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { SiteHeader } from "./_components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "How to Law", template: "%s | How to Law" },
  description: "변리사·변호사 시험 준비를 위한 조문 암기 서비스",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="flex min-h-screen flex-col antialiased">
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
