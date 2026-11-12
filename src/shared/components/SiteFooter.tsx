export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto max-w-3xl space-y-1 px-4 py-6 text-xs text-muted">
        <p>
          법령 데이터 출처:{" "}
          <a href="https://www.law.go.kr" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
            국가법령정보센터
          </a>
        </p>
        <p>학습용 서비스입니다. 법적 효력이 없으니 정확한 내용은 원문을 확인하세요.</p>
      </div>
    </footer>
  );
}
