// 법령정보센터 판례 API (수집 스크립트에서만 사용)
import { asList, lawApiGet } from "@/shared/lawgokr";

export interface PrecedentHit {
  판례일련번호: string;
  사건번호: string;
  선고일자: string; // "2026.04.30"
  법원명: string;
  사건명: string;
}

export interface PrecedentDetail {
  판례정보일련번호: string;
  사건번호: string;
  선고일자: string; // "20260430"
  법원명: string;
  사건명: string;
  판시사항?: string;
  판결요지?: string;
  참조조문?: string;
  참조판례?: string;
  판례내용?: string;
}

type SearchResponse = { PrecSearch: { totalCnt: string; prec?: PrecedentHit | PrecedentHit[] } };

/** 대법원 판결을 본문 검색으로 최신순 조회 (예: "민법 제750조") */
export async function searchSupremeCourt(query: string, display = 20): Promise<PrecedentHit[]> {
  const data = await lawApiGet<SearchResponse>("lawSearch.do", {
    target: "prec",
    query,
    search: "2", // 본문 검색
    curt: "대법원",
    sort: "ddes", // 선고일자 내림차순
    display: String(display),
  });
  return asList(data.PrecSearch.prec);
}

/** 사건번호로 판례 한 건 찾기. 없으면 null */
export async function findByCaseNo(caseNo: string): Promise<PrecedentHit | null> {
  const data = await lawApiGet<SearchResponse>("lawSearch.do", { target: "prec", nb: caseNo, display: "5" });
  return asList(data.PrecSearch.prec).find((p) => p.사건번호 === caseNo) ?? null;
}

export async function fetchPrecedent(id: string): Promise<PrecedentDetail> {
  const data = await lawApiGet<{ PrecService?: PrecedentDetail }>("lawService.do", { target: "prec", ID: id });
  if (!data.PrecService) throw new Error(`판례 ${id} 상세가 비어 있습니다.`);
  return data.PrecService;
}

/** API 본문의 <br/> 태그와 앞뒤 공백 정리 */
export const cleanText = (s?: string) =>
  (s ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

/** "20260430" 또는 "2026.04.30" → "2026-04-30" */
export const toIsoDate = (s: string) => {
  const d = s.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : s;
};
