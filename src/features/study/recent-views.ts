import { prisma } from "@/shared/db";
import { refWhere, type ArticleRef } from "./article-ref";
import { withTitles } from "./article-list";

export const RECENT_LIMIT = 50;

/** 최근 본 조문에 기록하고, 사용자당 RECENT_LIMIT개만 남긴다. */
export async function recordView(ref: ArticleRef) {
  const now = new Date();
  await prisma.recentView.upsert({ where: refWhere(ref), update: { viewedAt: now }, create: { ...ref, viewedAt: now } });
  const old = await prisma.recentView.findMany({
    where: { userId: ref.userId },
    orderBy: { viewedAt: "desc" },
    skip: RECENT_LIMIT,
    select: { lawId: true, articleKey: true },
  });
  if (old.length) {
    await prisma.recentView.deleteMany({ where: { userId: ref.userId, OR: old } });
  }
}

export async function listRecentViews(userId: string, take = RECENT_LIMIT) {
  const rows = await prisma.recentView.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, take });
  return withTitles(rows.map((r) => ({ ...r, at: r.viewedAt })));
}
