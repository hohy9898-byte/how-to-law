import Link from "next/link";
import { articleHref, articleName } from "@/lib/law-keys";
import { SEARCH_MAX_ARTICLES, type SearchResult } from "@/lib/search";

export function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const parts = text.split(q);
  return (
    <>
      {parts.map((p, i) => (
        <span key={i}>
          {p}
          {i < parts.length - 1 && <mark>{q}</mark>}
        </span>
      ))}
    </>
  );
}

export function SearchResults({ q, results, showLaw }: { q: string; results: SearchResult[]; showLaw?: boolean }) {
  if (!q) return null;
  return (
    <>
      <p className="mb-3 text-sm text-muted">
        &quot;{q}&quot; {results.length}개 조문
        {results.length === SEARCH_MAX_ARTICLES && ` (최대 ${SEARCH_MAX_ARTICLES}개까지 표시)`}
      </p>
      {results.length === 0 ? (
        <p className="py-6 text-center text-muted">검색 결과가 없습니다. 다른 낱말로 찾아보세요.</p>
      ) : (
        <ul className="divide-y divide-border">
          {results.map((r) => (
            <li key={`${r.lawSlug}:${r.key}`} className="py-3">
              <Link href={articleHref(r.lawSlug, r.key)} className="font-medium hover:text-accent">
                {showLaw && <span className="mr-1.5 text-sm font-normal text-muted">{r.lawName}</span>}
                {articleName(r.key)}
                {r.title && (
                  <>
                    (<Highlight text={r.title} q={q} />)
                  </>
                )}
              </Link>
              {r.lines.map((l, i) => (
                <p key={i} className="mt-1 text-sm leading-6">
                  <Highlight text={l} q={q} />
                </p>
              ))}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
