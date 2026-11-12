import Link from "next/link";
import { articleHref, articleName } from "@/lib/law-keys";
import type { ArticleListItem } from "@/lib/user-data";

const fmt = (d: Date) => d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

export function ArticleList({ items, empty }: { items: ArticleListItem[]; empty: string }) {
  if (items.length === 0) return <p className="py-3 text-sm text-muted">{empty}</p>;
  return (
    <ul className="divide-y divide-border text-sm">
      {items.map((it) => (
        <li key={`${it.lawSlug}:${it.articleKey}`}>
          <Link href={articleHref(it.lawSlug, it.articleKey)} className="flex items-baseline gap-2 py-2 hover:text-accent">
            <span className="shrink-0 text-muted">{it.lawName}</span>
            <span className="min-w-0 flex-1 truncate">
              {articleName(it.articleKey)}
              {it.title && `(${it.title})`}
              {it.preview && <span className="ml-2 text-muted">{it.preview}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted">{fmt(it.at)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
