import { prisma } from "./db";
import { ARTICLE_PARTS } from "./law";

export const SEARCH_MAX_ARTICLES = 100;

export interface SearchResult {
  lawSlug: string;
  lawName: string;
  key: string;
  title: string | null;
  /** 검색어가 들어 있는 본문 줄 (항·호는 번호를 앞에 붙임) */
  lines: string[];
}

/** 법령들의 최신 버전에서 조문 제목·본문을 검색한다. 항·호·목에서 찾은 것도 소속 조 단위로 묶는다. */
export async function searchArticles(slugs: string[] | "all", q: string): Promise<SearchResult[]> {
  const query = q.trim();
  if (!query) return [];

  const laws = await prisma.law.findMany({
    where: slugs === "all" ? {} : { slug: { in: slugs } },
    orderBy: { name: "asc" },
    include: { versions: { orderBy: { effectiveDate: "desc" }, take: 1, select: { id: true } } },
  });
  const versions = laws.flatMap((l) => (l.versions[0] ? [{ versionId: l.versions[0].id, law: l }] : []));
  if (!versions.length) return [];

  const hits = await prisma.provision.findMany({
    where: {
      versionId: { in: versions.map((v) => v.versionId) },
      level: { in: ARTICLE_PARTS },
      OR: [{ text: { contains: query } }, { title: { contains: query } }],
    },
    orderBy: [{ versionId: "asc" }, { seq: "asc" }],
    select: { id: true, articleId: true, level: true, key: true, text: true },
  });

  const grouped = new Map<string, string[]>();
  for (const h of hits) {
    const articleId = h.articleId ?? h.id;
    const lines = grouped.get(articleId) ?? [];
    if (h.text.includes(query)) lines.push(h.level === "ARTICLE" ? h.text : `${h.key} ${h.text}`);
    grouped.set(articleId, lines);
  }

  const articles = await prisma.provision.findMany({
    where: { id: { in: [...grouped.keys()].slice(0, SEARCH_MAX_ARTICLES) } },
    select: { id: true, versionId: true, key: true, title: true, sortKey: true },
  });
  const lawByVersion = new Map(versions.map((v) => [v.versionId, v.law]));
  const lawOrder = new Map(versions.map((v, i) => [v.versionId, i]));

  return articles
    .sort((a, b) => lawOrder.get(a.versionId)! - lawOrder.get(b.versionId)! || a.sortKey - b.sortKey)
    .map((a) => {
      const law = lawByVersion.get(a.versionId)!;
      return { lawSlug: law.slug, lawName: law.name, key: a.key, title: a.title, lines: grouped.get(a.id) ?? [] };
    });
}
