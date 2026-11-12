import { cache } from "react";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import { prisma } from "@/shared/db";
import { TOC_LEVEL, type TocRow } from "./toc";

export const DIVISIONS = ["PART", "CHAPTER", "SECTION", "SUBSECTION"];
export const ARTICLE_PARTS = ["ARTICLE", "PARAGRAPH", "ITEM", "SUBITEM"];

// 법령 본문은 import 전에는 바뀌지 않으므로 버전 id를 키로 캐시한다.
// 다시 import하면 새 버전 id가 생기므로 따로 비울 필요가 없다.

/** 목차 전체(편·장·절·관 + 조)를 압축 배열로. 문서 순서 */
export const getTocRows = (versionId: string) =>
  unstable_cache(
    async (): Promise<TocRow[]> => {
      const rows = await prisma.provision.findMany({
        where: { versionId, level: { in: [...DIVISIONS, "ARTICLE"] } },
        orderBy: { seq: "asc" },
        select: { id: true, parentId: true, level: true, key: true, title: true, isDeleted: true },
      });
      const depth = new Map<string, number>();
      return rows.map((r) => {
        const d = r.parentId ? (depth.get(r.parentId) ?? -1) + 1 : 0;
        depth.set(r.id, d);
        return [r.key, r.title, TOC_LEVEL[r.level], d, r.isDeleted ? 1 : 0];
      });
    },
    ["toc-rows", versionId],
  )();

/** 편·장·절·관 목록 (id → 부모·이름). 조문 화면의 목차 위치 표시용 */
export const getDivisions = (versionId: string) =>
  unstable_cache(
    () =>
      prisma.provision.findMany({
        where: { versionId, level: { in: DIVISIONS } },
        select: { id: true, parentId: true, key: true, title: true },
      }),
    ["divisions", versionId],
  )();

/** 조문의 parentId부터 위로 올라가며 목차 위치를 만든다. 예: [제3편 채권, 제5장 불법행위] */
export async function getBreadcrumb(versionId: string, parentId: string | null) {
  const byId = new Map((await getDivisions(versionId)).map((d) => [d.id, d]));
  const chain: { key: string; title: string | null }[] = [];
  for (let id = parentId; id; ) {
    const d = byId.get(id);
    if (!d) break;
    chain.unshift({ key: d.key, title: d.title });
    id = d.parentId;
  }
  return chain;
}

/** 법령과 가장 최근 시행일 버전 */
export const getLaw = cache(async (slug: string) => {
  const law = await prisma.law.findUnique({
    where: { slug },
    include: { versions: { orderBy: { effectiveDate: "desc" }, take: 1 } },
  });
  if (!law || law.versions.length === 0) notFound();
  return { ...law, version: law.versions[0] };
});

export type TreeNode<T> = T & { children: TreeNode<T>[] };

/** parentId로 연결된 평평한 목록(seq 순)을 트리로 만든다. */
export function buildTree<T extends { id: string; parentId: string | null }>(rows: T[], rootId: string | null = null) {
  const byId = new Map<string, TreeNode<T>>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const roots: TreeNode<T>[] = [];
  for (const node of byId.values()) {
    const parent = node.parentId && node.parentId !== rootId ? byId.get(node.parentId) : undefined;
    (parent ? parent.children : roots).push(node);
  }
  return roots;
}
