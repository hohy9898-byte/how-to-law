import { prisma } from "@/shared/db";
import { refWhere, type ArticleRef } from "./article-ref";
import { withTitles } from "./article-list";

export async function isBookmarked(ref: ArticleRef) {
  return (await prisma.bookmark.findUnique({ where: refWhere(ref) })) !== null;
}

/** 즐겨찾기를 켜고 끈다. 바뀐 뒤 상태를 돌려준다. */
export async function toggleBookmark(ref: ArticleRef): Promise<boolean> {
  const removed = await prisma.bookmark.deleteMany({ where: ref });
  if (removed.count > 0) return false;
  await prisma.bookmark.create({ data: ref });
  return true;
}

export async function listBookmarks(userId: string, take = 100) {
  const rows = await prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
  return withTitles(rows.map((r) => ({ ...r, at: r.createdAt })));
}
