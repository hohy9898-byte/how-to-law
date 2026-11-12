// 회원 데이터(가입·로그인, 즐겨찾기, 최근 본 조문, 메모).
// 서버 액션과 페이지는 이 함수들만 부른다. 조문은 (lawId, articleKey)로 가리킨다.
import { Prisma } from "@prisma/client";
import { hashPassword, validateCredentials, verifyPassword } from "./auth/password";
import { prisma } from "./db";

export const RECENT_LIMIT = 50;
export const NOTE_MAX = 5000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export async function createUser(email: string, password: string) {
  const e = normalizeEmail(email);
  const invalid = validateCredentials(e, password);
  if (invalid) return { error: invalid } as const;
  try {
    const user = await prisma.user.create({ data: { email: e, passwordHash: await hashPassword(password) } });
    return { user } as const;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "이미 가입된 이메일입니다." } as const;
    }
    throw err;
  }
}

/** 이메일·비밀번호가 맞으면 사용자, 아니면 null */
export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
  return user;
}

type ArticleRef = { userId: string; lawId: string; articleKey: string };
const id = ({ userId, lawId, articleKey }: ArticleRef) => ({ userId_lawId_articleKey: { userId, lawId, articleKey } });

export async function isBookmarked(ref: ArticleRef) {
  return (await prisma.bookmark.findUnique({ where: id(ref) })) !== null;
}

/** 즐겨찾기를 켜고 끈다. 바뀐 뒤 상태를 돌려준다. */
export async function toggleBookmark(ref: ArticleRef): Promise<boolean> {
  const removed = await prisma.bookmark.deleteMany({ where: ref });
  if (removed.count > 0) return false;
  await prisma.bookmark.create({ data: ref });
  return true;
}

/** 최근 본 조문에 기록하고, 사용자당 RECENT_LIMIT개만 남긴다. */
export async function recordView(ref: ArticleRef) {
  const now = new Date();
  await prisma.recentView.upsert({ where: id(ref), update: { viewedAt: now }, create: { ...ref, viewedAt: now } });
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

export async function getNote(ref: ArticleRef) {
  return (await prisma.note.findUnique({ where: id(ref) }))?.body ?? "";
}

/** 메모 저장. 빈 메모는 지운다. */
export async function saveNote(ref: ArticleRef, body: string) {
  const text = body.trim().slice(0, NOTE_MAX);
  if (!text) {
    await prisma.note.deleteMany({ where: ref });
    return "";
  }
  await prisma.note.upsert({ where: id(ref), update: { body: text }, create: { ...ref, body: text } });
  return text;
}

export interface ArticleListItem {
  lawSlug: string;
  lawName: string;
  articleKey: string;
  title: string | null;
  at: Date;
  preview?: string;
}

/** (lawId, articleKey) 목록에 법령명과 최신 버전의 조문 제목을 붙인다. */
async function withTitles(rows: { lawId: string; articleKey: string; at: Date; preview?: string }[]): Promise<ArticleListItem[]> {
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
    return [{ lawSlug: law.slug, lawName: law.name, articleKey: r.articleKey, title: titles.get(`${r.lawId}:${r.articleKey}`) ?? null, at: r.at, preview: r.preview }];
  });
}

export async function listBookmarks(userId: string, take = 100) {
  const rows = await prisma.bookmark.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
  return withTitles(rows.map((r) => ({ ...r, at: r.createdAt })));
}

export async function listRecentViews(userId: string, take = RECENT_LIMIT) {
  const rows = await prisma.recentView.findMany({ where: { userId }, orderBy: { viewedAt: "desc" }, take });
  return withTitles(rows.map((r) => ({ ...r, at: r.viewedAt })));
}

export async function listNotes(userId: string, take = 100) {
  const rows = await prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take });
  return withTitles(rows.map((r) => ({ ...r, at: r.updatedAt, preview: r.body.slice(0, 80) })));
}
