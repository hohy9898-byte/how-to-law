"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const SHOW_DELAY_MS = 150; // 이보다 빨리 끝나면 막대를 띄우지 않는다 (깜빡임 방지)
const MAX_MS = 10_000; // 이동이 취소되는 경우를 대비해 최대 이 시간 뒤에는 끈다

/** 링크 클릭이나 검색 폼 제출로 페이지를 옮길 때 화면 위쪽에 진행 막대를 띄운다. */
export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);

  // 주소가 바뀌면 이동이 끝난 것
  useEffect(() => {
    setStartedAt(null);
    setVisible(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    const current = () => window.location.pathname + window.location.search;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname + url.search === current()) return; // 같은 페이지 안의 #이동
      setStartedAt(Date.now());
    };

    // GET 폼(검색)만. 서버 액션 폼은 주소가 안 바뀌어서 각 폼이 직접 "저장 중"을 표시한다.
    const onSubmit = (e: SubmitEvent) => {
      const form = e.target as HTMLFormElement;
      if (e.defaultPrevented || (form.getAttribute("method") ?? "get").toLowerCase() !== "get") return;
      if (typeof form.getAttribute("action") !== "string") return;
      setStartedAt(Date.now());
    };

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  useEffect(() => {
    if (startedAt === null) return;
    const show = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    const stop = setTimeout(() => {
      setStartedAt(null);
      setVisible(false);
    }, MAX_MS);
    return () => {
      clearTimeout(show);
      clearTimeout(stop);
    };
  }, [startedAt]);

  if (!visible) return null;
  return (
    <div role="progressbar" aria-label="페이지 불러오는 중" className="fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-accent/20">
      <div className="h-full w-1/3 animate-[nav-progress_1s_ease-in-out_infinite] bg-accent" />
    </div>
  );
}
