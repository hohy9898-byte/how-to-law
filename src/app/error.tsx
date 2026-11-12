"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="py-16 text-center">
      <h1 className="text-lg font-medium">문제가 생겼습니다</h1>
      <p className="mt-1 text-sm text-muted">잠시 후 다시 시도해 주세요.</p>
      <div className="mt-6 flex justify-center gap-3 text-sm">
        <button onClick={reset} className="rounded border border-border px-3 py-1.5 hover:text-accent">
          다시 시도
        </button>
        <Link href="/" className="rounded border border-border px-3 py-1.5 hover:text-accent">
          홈으로
        </Link>
      </div>
    </div>
  );
}
