import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { getCurrentUser } from "@/lib/auth/session";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold">
          How to Law
        </Link>
        <nav className="flex gap-3 text-sm">
          <Link href="/laws" className="hover:text-accent">
            법령
          </Link>
          <Link href="/me" className="hover:text-accent">
            내 페이지
          </Link>
        </nav>
        <form action="/search" className="order-last flex w-full gap-1 sm:order-none sm:ml-auto sm:w-56">
          <input
            name="q"
            placeholder="조문 검색"
            aria-label="전체 조문 검색"
            className="min-w-0 flex-1 rounded border border-border bg-transparent px-2 py-1 text-sm"
          />
        </form>
        <div className="ml-auto flex items-center gap-3 text-sm sm:ml-0">
          {user ? (
            <>
              <span className="hidden max-w-40 truncate text-muted sm:inline" title={user.email}>
                {user.email}
              </span>
              <form action={logout}>
                <button className="hover:text-accent">로그아웃</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="hover:text-accent">
                로그인
              </Link>
              <Link href="/signup" className="rounded bg-accent px-2.5 py-1 text-white hover:opacity-90">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
