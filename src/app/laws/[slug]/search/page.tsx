import Link from "next/link";
import { LawToolbar } from "@/components/LawToolbar";
import { prisma } from "@/lib/db";
import { ARTICLE_PARTS, articleHref, articleName, getLaw } from "@/lib/law";

export const dynamic = "force-dynamic";

const MAX_ARTICLES = 100;

function Highlight({ text, q }: { text: string; q: string }) {
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

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { slug } = await params;
  const q = ((await searchParams).q ?? "").trim();
  const law = await getLaw(slug);

  let results: { key: string; title: string | null; lines: string[] }[] = [];
  if (q) {
    const hits = await prisma.provision.findMany({
      where: {
        versionId: law.version.id,
        level: { in: ARTICLE_PARTS },
        OR: [{ text: { contains: q } }, { title: { contains: q } }],
      },
      orderBy: { seq: "asc" },
      select: { id: true, articleId: true, level: true, key: true, text: true },
    });

    // 항·호·목에서 찾은 것도 소속 조 단위로 묶는다.
    const grouped = new Map<string, string[]>();
    for (const h of hits) {
      const id = h.articleId ?? h.id;
      const lines = grouped.get(id) ?? [];
      if (h.text.includes(q)) lines.push(h.level === "ARTICLE" ? h.text : `${h.key} ${h.text}`);
      grouped.set(id, lines);
    }
    const ids = [...grouped.keys()].slice(0, MAX_ARTICLES);
    const articles = await prisma.provision.findMany({
      where: { id: { in: ids } },
      orderBy: { sortKey: "asc" },
      select: { id: true, key: true, title: true },
    });
    results = articles.map((a) => ({ key: a.key, title: a.title, lines: grouped.get(a.id) ?? [] }));
  }

  return (
    <div>
      <p className="mb-2 text-sm text-muted">
        <Link href={`/laws/${slug}`} className="hover:text-accent">
          {law.name}
        </Link>{" "}
        › 검색
      </p>
      <LawToolbar slug={slug} query={q} />
      {q && (
        <p className="mb-3 text-sm text-muted">
          &quot;{q}&quot; {results.length}개 조문{results.length === MAX_ARTICLES && " (최대 100개까지 표시)"}
        </p>
      )}
      <ul className="divide-y divide-border">
        {results.map((r) => (
          <li key={r.key} className="py-3">
            <Link href={articleHref(slug, r.key)} className="font-medium hover:text-accent">
              {articleName(r.key)}
              {r.title && <>(<Highlight text={r.title} q={q} />)</>}
            </Link>
            {r.lines.map((l, i) => (
              <p key={i} className="mt-1 text-sm leading-6">
                <Highlight text={l} q={q} />
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
