import { prisma } from "@/shared/db";
import { refWhere, type ArticleRef } from "./article-ref";
import { withTitles } from "./article-list";

export const NOTE_MAX = 5000;

export async function getNote(ref: ArticleRef) {
  return (await prisma.note.findUnique({ where: refWhere(ref) }))?.body ?? "";
}

/** 메모 저장. 빈 메모는 지운다. 저장된 본문을 돌려준다. */
export async function saveNote(ref: ArticleRef, body: string) {
  const text = body.trim().slice(0, NOTE_MAX);
  if (!text) {
    await prisma.note.deleteMany({ where: ref });
    return "";
  }
  await prisma.note.upsert({ where: refWhere(ref), update: { body: text }, create: { ...ref, body: text } });
  return text;
}

export async function listNotes(userId: string, take = 100) {
  const rows = await prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take });
  return withTitles(rows.map((r) => ({ ...r, at: r.updatedAt, preview: r.body.slice(0, 80) })));
}
