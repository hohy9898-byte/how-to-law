// 법령 본문 수집용 API 호출 (수집 스크립트에서만 사용)
import { asList, lawApiGet } from "@/shared/lawgokr";
import type { LawApiResponse } from "./parser/adapters/api";

export interface LawSearchHit {
  법령일련번호: string;
  법령명한글: string;
  시행일자: string;
  현행연혁코드: string;
}

/** 법령명으로 검색해서 이름이 정확히 같은 현행 법령을 돌려준다. */
export async function findCurrentLaw(name: string): Promise<LawSearchHit> {
  const data = await lawApiGet<{ LawSearch: { law?: LawSearchHit | LawSearchHit[] } }>("lawSearch.do", {
    target: "law",
    query: name,
    display: "100",
  });
  const hits = asList(data.LawSearch.law);
  const hit = hits.find((h) => h.법령명한글.trim() === name && h.현행연혁코드 === "현행");
  if (!hit) throw new Error(`"${name}"을(를) 찾지 못했습니다. 검색 결과: ${hits.map((h) => h.법령명한글).join(", ")}`);
  return hit;
}

/** 법령 본문 전체 (MST = 법령일련번호) */
export function fetchLaw(mst: string): Promise<LawApiResponse> {
  return lawApiGet<LawApiResponse>("lawService.do", { target: "law", MST: mst });
}
