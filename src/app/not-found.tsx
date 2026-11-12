import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="text-4xl font-semibold text-muted">404</p>
      <h1 className="mt-2 text-lg font-medium">페이지를 찾을 수 없습니다</h1>
      <p className="mt-1 text-sm text-muted">없는 조문 번호이거나 주소가 잘못됐을 수 있습니다.</p>
      <div className="mt-6 flex justify-center gap-3 text-sm">
        <Link href="/" className="rounded border border-border px-3 py-1.5 hover:text-accent">
          홈으로
        </Link>
        <Link href="/laws" className="rounded border border-border px-3 py-1.5 hover:text-accent">
          법령 목록
        </Link>
      </div>
    </div>
  );
}
