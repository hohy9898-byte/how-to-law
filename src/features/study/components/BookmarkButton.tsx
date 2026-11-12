import { toggleBookmarkAction } from "../actions";

type Props = { lawId: string; articleKey: string; path: string; bookmarked: boolean };

/** 조문 즐겨찾기 켜기/끄기. JS 없이도 동작하는 서버 액션 폼 */
export function BookmarkButton({ lawId, articleKey, path, bookmarked }: Props) {
  return (
    <form action={toggleBookmarkAction}>
      <input type="hidden" name="lawId" value={lawId} />
      <input type="hidden" name="articleKey" value={articleKey} />
      <input type="hidden" name="path" value={path} />
      <button
        aria-pressed={bookmarked}
        title={bookmarked ? "즐겨찾기 해제" : "즐겨찾기"}
        className={`shrink-0 rounded border px-2 py-0.5 text-sm ${bookmarked ? "border-accent text-accent" : "border-border hover:text-accent"}`}
      >
        {bookmarked ? "★ 즐겨찾기" : "☆ 즐겨찾기"}
      </button>
    </form>
  );
}
