import Link from "next/link";
import { getCurrentUser } from "@/features/auth";
import { LawCards, articleHref, articleName } from "@/features/law";
import { ArticleList, listBookmarks, listRecentViews } from "@/features/study";
import { prisma } from "@/shared/db";

export const dynamic = "force-dynamic";

// 자주 찾는 조문 (법령 slug, 조 키)
const POPULAR: [string, string][] = [
  ["civil", "2"],
  ["civil", "103"],
  ["civil", "162"],
  ["civil", "390"],
  ["civil", "750"],
];

async function popularArticles() {
  const laws = await prisma.law.findMany({
    where: { slug: { in: [...new Set(POPULAR.map(([s]) => s))] } },
    include: { versions: { orderBy: { effectiveDate: "desc" }, take: 1, select: { id: true } } },
  });
  const found = await Promise.all(
    POPULAR.map(async ([slug, key]) => {
      const versionId = laws.find((l) => l.slug === slug)?.versions[0]?.id;
      if (!versionId) return null;
      const a = await prisma.provision.findFirst({ where: { versionId, level: "ARTICLE", key }, select: { title: true } });
      return a ? { slug, key, title: a.title } : null;
    }),
  );
  return found.filter((a) => a !== null);
}

function Section({ title, more, children }: { title: string; more?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-semibold">{title}</h2>
        {more && (
          <Link href={more} className="text-sm text-muted hover:text-accent">
            더 보기 →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export default async function Home() {
  const user = await getCurrentUser();
  const [popular, recent, bookmarks] = await Promise.all([
    popularArticles(),
    user ? listRecentViews(user.id, 5) : [],
    user ? listBookmarks(user.id, 5) : [],
  ]);

  return (
    <div>
      <section className="py-6">
        <h1 className="text-2xl font-semibold">조문, 찾고 읽고 외우기</h1>
        <p className="mt-1 text-muted">변리사·변호사 시험 준비를 위한 법조문 학습 서비스입니다.</p>
        <form action="/search" className="mt-5 flex gap-2">
          <input
            name="q"
            placeholder="조문 제목이나 본문으로 검색 (예: 소멸시효, 불법행위)"
            aria-label="조문 검색"
            className="min-w-0 flex-1 rounded-lg border border-border bg-transparent px-3 py-2.5"
          />
          <button className="rounded-lg bg-accent px-4 text-white hover:opacity-90">검색</button>
        </form>
      </section>

      <Section title="법령">
        <LawCards />
      </Section>

      {popular.length > 0 && (
        <Section title="자주 찾는 조문">
          <div className="flex flex-wrap gap-2 text-sm">
            {popular.map((a) => (
              <Link
                key={`${a.slug}:${a.key}`}
                href={articleHref(a.slug, a.key)}
                className="rounded-full border border-border px-3 py-1 hover:border-accent hover:text-accent"
              >
                {articleName(a.key)}
                {a.title && ` ${a.title}`}
              </Link>
            ))}
          </div>
        </Section>
      )}

      {user ? (
        <div className="grid gap-x-8 sm:grid-cols-2">
          <Section title="최근 본 조문" more="/me#recent">
            <ArticleList items={recent} empty="아직 본 조문이 없습니다." />
          </Section>
          <Section title="즐겨찾기" more="/me#bookmarks">
            <ArticleList items={bookmarks} empty="조문 화면에서 ☆를 눌러 추가하세요." />
          </Section>
        </div>
      ) : (
        <section className="mt-10 rounded-lg border border-border p-5">
          <h2 className="font-semibold">회원이 되면</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">
            <li>조문을 즐겨찾기해 두고 모아 볼 수 있습니다.</li>
            <li>최근 본 조문으로 바로 돌아갈 수 있습니다.</li>
            <li>조문마다 두문자, 판례 메모를 남길 수 있습니다.</li>
          </ul>
          <div className="mt-4 flex gap-2 text-sm">
            <Link href="/signup" className="rounded bg-accent px-3 py-1.5 text-white hover:opacity-90">
              회원가입
            </Link>
            <Link href="/login" className="rounded border border-border px-3 py-1.5 hover:text-accent">
              로그인
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
