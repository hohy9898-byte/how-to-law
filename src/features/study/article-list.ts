// 즐겨찾기·최근 본 조문·메모 목록에 법령명과 최신 버전의 조문 제목을 붙인다.
import { prisma } from "@/shared/db";

export interface ArticleListItem {
  lawSlug: string;
  lawName: string;
  articleKey: string;
  title: string | null;
  at: Date;
  preview?: string;
}

type Row = { lawId: string; articleKey: string; at: Date; preview?: string };

export async function withTitles(rows: Row[]): Promise<ArticleListItem[]> {
  if (!rows.length) return [];
  const lawIds = [...new Set(rows.map((r) => r.lawId))];
  const laws = await prisma.law.findMany({
    where: { id: { in: lawIds } },
    include: { versions: { orderBy: { effectiveDate: "desc" }, take: 1, select: { id: true } } },
  });
  const titles = new Map<string, string | null>();
  for (const law of laws) {
    const versionId = law.versions[0]?.id;
    if (!versionId) continue;
    const keys = rows.filter((r) => r.lawId === law.id).map((r) => r.articleKey);
    const arts = await prisma.provision.findMany({
      where: { versionId, level: "ARTICLE", key: { in: keys } },
      select: { key: true, title: true },
    });
    arts.forEach((a) => titles.set(`${law.id}:${a.key}`, a.title));
  }
  const byId = new Map(laws.map((l) => [l.id, l]));
  return rows.flatMap((r) => {
    const law = byId.get(r.lawId);
    if (!law) return [];
    return [
      {
        lawSlug: law.slug,
        lawName: law.name,
        articleKey: r.articleKey,
        title: titles.get(`${r.lawId}:${r.articleKey}`) ?? null,
        at: r.at,
        preview: r.preview,
      },
    ];
  });
}
