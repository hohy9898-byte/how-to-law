"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { articleHref, normalizeArticleKey } from "../keys";

/** 조문 번호 바로가기 + 검색 */
export function LawToolbar({ slug, query = "" }: { slug: string; query?: string }) {
  const router = useRouter();
  const [no, setNo] = useState("");
  const [error, setError] = useState(false);

  return (
    <div className="mb-6 flex flex-wrap gap-2 text-sm">
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          const key = normalizeArticleKey(no);
          setError(!key);
          if (key) router.push(articleHref(slug, key));
        }}
      >
        <input
          value={no}
          onChange={(e) => setNo(e.target.value)}
          placeholder="조 번호 (750, 750의2)"
          aria-label="조 번호"
          className={`w-44 rounded border bg-transparent px-2 py-1 ${error ? "border-red-500" : "border-border"}`}
        />
        <button className="rounded border border-border px-2 py-1 hover:text-accent">이동</button>
      </form>
      <form action={`/laws/${slug}/search`} className="flex flex-1 gap-1">
        <input
          name="q"
          defaultValue={query}
          placeholder="검색 (예: 소멸시효)"
          aria-label="검색어"
          className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1"
        />
        <button className="rounded border border-border px-2 py-1 hover:text-accent">검색</button>
      </form>
    </div>
  );
}
