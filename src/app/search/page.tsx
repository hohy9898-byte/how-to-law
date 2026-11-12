import type { Metadata } from "next";
import { SearchResults } from "@/components/SearchResults";
import { searchArticles } from "@/lib/search";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = ((await searchParams).q ?? "").trim();
  return { title: q ? `"${q}" 검색` : "검색" };
}

export default async function SearchPage({ searchParams }: Props) {
  const q = ((await searchParams).q ?? "").trim();
  const results = await searchArticles("all", q);

  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold">전체 검색</h1>
      <form action="/search" className="mb-6 flex gap-1 text-sm">
        <input
          name="q"
          defaultValue={q}
          placeholder="조문 제목이나 본문 (예: 소멸시효)"
          aria-label="검색어"
          className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1.5"
        />
        <button className="rounded border border-border px-3 py-1.5 hover:text-accent">검색</button>
      </form>
      {q ? <SearchResults q={q} results={results} showLaw /> : <p className="text-muted">검색어를 입력하세요.</p>}
    </div>
  );
}
