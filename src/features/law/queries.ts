import { cache } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/shared/db";

export const DIVISIONS = ["PART", "CHAPTER", "SECTION", "SUBSECTION"];
export const ARTICLE_PARTS = ["ARTICLE", "PARAGRAPH", "ITEM", "SUBITEM"];


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
