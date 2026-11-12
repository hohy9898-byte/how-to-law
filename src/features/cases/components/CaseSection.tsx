import { getCasesForArticle, type CaseListItem } from "../queries";
import { CaseButton, CaseDialogProvider } from "./CaseDialog";

function CaseList({ title, items, empty }: { title: string; items: CaseListItem[]; empty: string }) {
  return (
    <div>
      <h3 className="mb-1 font-medium">{title}</h3>
      {items.length === 0 ? (
        <p className="text-muted">{empty}</p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline gap-x-2">
              <CaseButton id={c.id}>{c.caseNo}</CaseButton>
              <span className="text-xs text-muted">{c.decidedAt}</span>
              {c.examMarked && <span className="rounded bg-accent/10 px-1 text-xs text-accent">기출</span>}
              {c.citedBy > 0 && <span className="text-xs text-muted">인용 {c.citedBy}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 조문 화면의 판례 영역: 최신 판례 / 주요 판례. 사건번호를 누르면 팝업 */
export async function CaseSection({ lawId, articleKey }: { lawId: string; articleKey: string }) {
  const { recent, major, total } = await getCasesForArticle(lawId, articleKey);

  return (
    <section className="mt-8 border-t border-border pt-4 text-sm">
      <h2 className="mb-2 font-medium">
        관련 판례 {total > 0 && <span className="font-normal text-muted">대법원 {total}건</span>}
      </h2>
      {total === 0 ? (
        <p className="text-muted">아직 수집한 판례가 없습니다.</p>
      ) : (
        <CaseDialogProvider>
          <div className="grid gap-4 sm:grid-cols-2">
            <CaseList title="최신 판례" items={recent} empty="없음" />
            <CaseList title="주요 판례" items={major} empty="다른 판례가 인용한 판례가 아직 없습니다." />
          </div>
          <p className="mt-2 text-xs text-muted">주요 판례: 기출 표시한 판례, 그다음 다른 대법원 판례가 많이 인용한 순</p>
        </CaseDialogProvider>
      )}
    </section>
  );
}
