"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { CaseDetail } from "../queries";

// 사건번호 버튼(CaseButton)이 여러 개여도 팝업(dialog)은 하나만 둔다.
const OpenCaseContext = createContext<(id: string) => void>(() => {});

/** 첫 번째 판시사항 항목 (AI 핵심 구문이 없을 때 대신 보여 준다) */
function firstHolding(holdings: string) {
  const parts = holdings.split(/\[\d+\]/).map((s) => s.trim()).filter(Boolean);
  return parts[0] ?? holdings.trim();
}

/** 판결요지에서 핵심 구문을 <mark>로 강조 */
function Highlighted({ text, marks }: { text: string; marks: string[] }) {
  const ranges: [number, number][] = [];
  for (const m of marks) {
    const at = text.indexOf(m);
    if (at >= 0) ranges.push([at, at + m.length]);
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const out: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([s, e], i) => {
    if (s < cursor) return;
    out.push(text.slice(cursor, s), <mark key={i}>{text.slice(s, e)}</mark>);
    cursor = e;
  });
  out.push(text.slice(cursor));
  return <>{out}</>;
}

function Body({ data }: { data: CaseDetail }) {
  const hasKey = data.keySentences.length > 0;
  return (
    <div className="space-y-5 text-[15px] leading-7">
      <section className="rounded-lg border border-accent/40 bg-accent/5 p-4">
        <h3 className="mb-1 text-sm font-semibold text-accent">핵심 구문</h3>
        {hasKey ? (
          <>
            {data.keySentences.map((s, i) => (
              <p key={i} className="font-medium">
                {s}
              </p>
            ))}
            <p className="mt-2 text-xs text-muted">AI가 판결요지에서 원문 그대로 뽑은 문장입니다. 원문과 대조해 확인하세요.</p>
          </>
        ) : (
          <>
            <p className="font-medium">{firstHolding(data.holdings) || "판시사항이 없습니다."}</p>
            <p className="mt-2 text-xs text-muted">아직 핵심 구문을 뽑지 않은 판례라 판시사항 첫 항목을 보여 줍니다.</p>
          </>
        )}
      </section>

      {data.holdings && (
        <section>
          <h3 className="mb-1 font-semibold">판시사항</h3>
          <p className="whitespace-pre-line">{data.holdings}</p>
        </section>
      )}
      {data.summary && (
        <section>
          <h3 className="mb-1 font-semibold">판결요지</h3>
          <p className="whitespace-pre-line">
            <Highlighted text={data.summary} marks={data.keySentences} />
          </p>
        </section>
      )}
      {data.refArticles && (
        <section>
          <h3 className="mb-1 font-semibold">참조조문</h3>
          <p className="whitespace-pre-line text-sm">{data.refArticles}</p>
        </section>
      )}
      {data.fullText && (
        <details>
          <summary className="font-semibold">판결 전문</summary>
          <p className="mt-2 whitespace-pre-line text-sm">{data.fullText}</p>
        </details>
      )}
    </div>
  );
}

export function CaseDialogProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [id, setId] = useState<string | null>(null);
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState(false);

  const open = useCallback((caseId: string) => {
    setId(caseId);
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setData(null);
    setError(false);
    fetch(`/api/cases/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<CaseDetail>) : Promise.reject(r.status)))
      .then((d) => !cancelled && setData(d))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <OpenCaseContext.Provider value={open}>
      {children}
      <dialog
        ref={ref}
        onClose={() => setId(null)}
        onClick={(e) => e.target === ref.current && ref.current?.close()} // 바깥(배경) 클릭으로 닫기
        className="m-auto max-h-[85vh] w-[min(46rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-black/40"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-border bg-background px-5 py-3">
          <div>
            <p className="font-semibold">{data ? `${data.court} ${data.decidedAt} 선고 ${data.caseNo}` : "판례"}</p>
            {data && <p className="text-sm text-muted">{data.caseName}</p>}
          </div>
          <button type="button" onClick={() => ref.current?.close()} className="text-muted hover:text-accent" aria-label="닫기">
            ✕
          </button>
        </div>
        <div className="px-5 py-4">
          {error ? (
            <p className="text-muted">판례를 불러오지 못했습니다.</p>
          ) : data ? (
            <Body data={data} />
          ) : (
            <p className="text-muted">불러오는 중…</p>
          )}
        </div>
      </dialog>
    </OpenCaseContext.Provider>
  );
}

/** 사건번호만 보여 주는 버튼. 누르면 팝업이 열린다. */
export function CaseButton({ id, children }: { id: string; children: ReactNode }) {
  const open = useContext(OpenCaseContext);
  return (
    <button type="button" onClick={() => open(id)} className="text-left text-accent hover:underline">
      {children}
    </button>
  );
}
