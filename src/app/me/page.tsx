import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth";
import { ArticleList, listBookmarks, listNotes, listRecentViews } from "@/features/study";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "내 페이지" };

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/me");

  const [bookmarks, notes, recent] = await Promise.all([
    listBookmarks(user.id),
    listNotes(user.id),
    listRecentViews(user.id),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold">내 페이지</h1>
        <p className="text-sm text-muted">{user.email}</p>
      </div>
      <section id="bookmarks">
        <h2 className="mb-1 font-semibold">즐겨찾기 {bookmarks.length > 0 && <span className="text-muted">{bookmarks.length}</span>}</h2>
        <ArticleList items={bookmarks} empty="조문 화면에서 ☆를 눌러 추가하세요." />
      </section>
      <section id="notes">
        <h2 className="mb-1 font-semibold">메모 {notes.length > 0 && <span className="text-muted">{notes.length}</span>}</h2>
        <ArticleList items={notes} empty="조문 화면 아래쪽에서 메모를 남길 수 있습니다." />
      </section>
      <section id="recent">
        <h2 className="mb-1 font-semibold">최근 본 조문</h2>
        <ArticleList items={recent} empty="아직 본 조문이 없습니다." />
      </section>
    </div>
  );
}
