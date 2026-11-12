import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { getCurrentUser } from "@/features/auth";
import {
  LawToolbar,
  LinkedText,
  articleHref,
  articleName,
  buildTree,
  getBreadcrumb,
  getLaw,
  keyToParam,
  normalizeArticleKey,
  type TreeNode,
} from "@/features/law";
import { BookmarkButton, NoteEditor, getNote, isBookmarked, recordView } from "@/features/study";
import { prisma } from "@/shared/db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string; no: string }> };

/** 조문 본체 + 참조. 페이지 제목과 본문이 같은 요청 안에서 한 번만 조회하도록 cache */
const getArticle = cache((versionId: string, key: string) =>
  prisma.provision.findFirst({
    where: { versionId, level: "ARTICLE", key },
    include: {
      refsFrom: { include: { to: { select: { key: true, title: true } } } },
      refsTo: { include: { from: { select: { key: true, title: true, sortKey: true } } } },
    },
  }),
);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, no } = await params;
  const key = normalizeArticleKey(no);
  if (!key) return {};
  const law = await getLaw(slug);
  const a = await getArticle(law.version.id, key);
  return { title: `${articleName(key)}${a?.title ? `(${a.title})` : ""} - ${law.name}` };
}

type Part = { id: string; parentId: string | null; level: string; key: string; text: string; amendNote: string | null };

const INDENT: Record<string, string> = { PARAGRAPH: "", ITEM: "ml-5", SUBITEM: "ml-5" };

function Notes({ note }: { note: string | null }) {
  if (!note) return null;
  return <span className="ml-1 text-xs text-muted">{note.split("\n").join(" ")}</span>;
}

function PartNode({ node, slug, known }: { node: TreeNode<Part>; slug: string; known: Set<string> }) {
  return (
    <div className={INDENT[node.level]}>
      <p className="flex gap-1.5 py-0.5">
        <span className="shrink-0">{node.key}</span>
        <span>
          <LinkedText text={node.text} slug={slug} known={known} />
          <Notes note={node.amendNote} />
        </span>
      </p>
      {node.children.map((c) => (
        <PartNode key={c.id} node={c} slug={slug} known={known} />
      ))}
    </div>
  );
}

export default async function ArticlePage({ params }: Props) {
  const { slug, no } = await params;
  const key = normalizeArticleKey(no);
  if (!key) notFound();
  const law = await getLaw(slug);
  const versionId = law.version.id;

  const article = await getArticle(versionId, key);
  if (!article) notFound();

  const [parts, crumbs, prev, next, user] = await Promise.all([
    prisma.provision.findMany({
      where: { articleId: article.id },
      orderBy: { seq: "asc" },
      select: { id: true, parentId: true, level: true, key: true, text: true, amendNote: true },
    }),
    getBreadcrumb(versionId, article.parentId),
    prisma.provision.findFirst({
      where: { versionId, level: "ARTICLE", sortKey: { lt: article.sortKey } },
      orderBy: { sortKey: "desc" },
      select: { key: true, title: true },
    }),
    prisma.provision.findFirst({
      where: { versionId, level: "ARTICLE", sortKey: { gt: article.sortKey } },
      orderBy: { sortKey: "asc" },
      select: { key: true, title: true },
    }),
    getCurrentUser(),
  ]);

  const path = `/laws/${slug}/articles/${keyToParam(key)}`;
  const ref = user ? { userId: user.id, lawId: law.id, articleKey: key } : null;
  const [bookmarked, note] = ref ? await Promise.all([isBookmarked(ref), getNote(ref)]) : [false, ""];
  // 최근 본 조문 기록은 화면과 상관없으므로 응답을 보낸 뒤에 한다.
  if (ref) after(() => recordView(ref));

  const known = new Set(article.refsFrom.map((r) => r.to.key));
  const incoming = [...article.refsTo].sort((a, b) => a.from.sortKey - b.from.sortKey);
  const label = (a: { key: string; title: string | null }) => `${articleName(a.key)}${a.title ? `(${a.title})` : ""}`;

  return (
    <div>
      <LawToolbar slug={slug} />

      <nav className="mb-2 text-sm text-muted">
        <Link href={`/laws/${slug}`} className="hover:text-accent">
          {law.name}
        </Link>
        {crumbs.map((c, i) => (
          <span key={i}>
            {" › "}
            {c.key} {c.title}
          </span>
        ))}
      </nav>

      <article className="leading-7">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h1 className="text-lg font-semibold">
            {articleName(article.key)}
            {article.title && `(${article.title})`}
            {article.isDeleted && <span className="ml-2 text-sm font-normal text-muted">삭제</span>}
          </h1>
          {user && <BookmarkButton lawId={law.id} articleKey={key} path={path} bookmarked={bookmarked} />}
        </div>
        {article.text && (
          <p>
            <LinkedText text={article.text} slug={slug} known={known} />
          </p>
        )}
        {buildTree(parts, article.id).map((p) => (
          <PartNode key={p.id} node={p} slug={slug} known={known} />
        ))}
        {article.amendNote && <p className="mt-2 text-xs text-muted">{article.amendNote.split("\n").join(" ")}</p>}
      </article>

      <section className="mt-8 border-t border-border pt-4">
        <h2 className="mb-2 text-sm font-medium">내 메모</h2>
        {user ? (
          <NoteEditor key={path} lawId={law.id} articleKey={key} path={path} initial={note} />
        ) : (
          <p className="text-sm text-muted">
            <Link href={`/login?next=${encodeURIComponent(path)}`} className="text-accent hover:underline">
              로그인
            </Link>
            하면 이 조문을 즐겨찾기하고 메모를 남길 수 있습니다.
          </p>
        )}
      </section>

      {(article.refsFrom.length > 0 || incoming.length > 0) && (
        <section className="mt-8 grid gap-4 border-t border-border pt-4 text-sm sm:grid-cols-2">
          {article.refsFrom.length > 0 && (
            <div>
              <h2 className="mb-1 font-medium">이 조문이 가리키는 조문</h2>
              <ul>
                {article.refsFrom.map((r) => (
                  <li key={r.toId}>
                    <Link href={articleHref(slug, r.to.key)} className="hover:text-accent">
                      {label(r.to)}
                    </Link>
                    {r.kind === "APPLY" && <span className="ml-1 text-xs text-muted">준용</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {incoming.length > 0 && (
            <div>
              <h2 className="mb-1 font-medium">이 조문을 가리키는 조문</h2>
              <ul>
                {incoming.map((r) => (
                  <li key={r.fromId}>
                    <Link href={articleHref(slug, r.from.key)} className="hover:text-accent">
                      {label(r.from)}
                    </Link>
                    {r.kind === "APPLY" && <span className="ml-1 text-xs text-muted">준용</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <nav className="mt-8 flex justify-between border-t border-border pt-4 text-sm">
        {prev ? (
          <Link href={articleHref(slug, prev.key)} className="hover:text-accent">
            ← {label(prev)}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={articleHref(slug, next.key)} className="hover:text-accent">
            {label(next)} →
          </Link>
        )}
      </nav>
    </div>
  );
}
