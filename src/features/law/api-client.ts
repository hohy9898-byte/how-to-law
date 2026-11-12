// 국가법령정보센터 Open API 호출. 인증값(OC)은 .env의 LAW_API_OC에서 읽는다.
// 서비스 화면에서 직접 부르지 않고, 수집 스크립트(배치)에서만 쓴다.
import type { LawApiResponse } from "./parser/adapters/api";

const BASE = "http://www.law.go.kr/DRF";

function oc(): string {
  const v = process.env.LAW_API_OC;
  if (!v) throw new Error("LAW_API_OC가 없습니다. .env에 LAW_API_OC=<가입 이메일 @ 앞부분>을 넣으세요.");
  return v;
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${BASE}/${path}?${new URLSearchParams({ OC: oc(), type: "JSON", ...params })}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`법령 API ${path} 실패: HTTP ${res.status}`);
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // 인증 실패나 IP 미등록이면 JSON 대신 안내 문구(HTML)가 온다.
    throw new Error(`법령 API ${path} 응답이 JSON이 아닙니다. OC 값과 등록 IP를 확인하세요.\n${text.slice(0, 300)}`);
  }
}

export interface LawSearchHit {
  법령일련번호: string;
  법령명한글: string;
  시행일자: string;
  현행연혁코드: string;
}

/** 법령명으로 검색해서 이름이 정확히 같은 현행 법령을 돌려준다. */
export async function findCurrentLaw(name: string): Promise<LawSearchHit> {
  const data = await getJson<{ LawSearch: { law?: LawSearchHit | LawSearchHit[] } }>("lawSearch.do", {
    target: "law",
    query: name,
    display: "100",
  });
  const hits = [data.LawSearch.law ?? []].flat();
  const hit = hits.find((h) => h.법령명한글.trim() === name && h.현행연혁코드 === "현행");
  if (!hit) throw new Error(`"${name}"을(를) 찾지 못했습니다. 검색 결과: ${hits.map((h) => h.법령명한글).join(", ")}`);
  return hit;
}

/** 법령 본문 전체 (MST = 법령일련번호) */
export function fetchLaw(mst: string): Promise<LawApiResponse> {
  return getJson<LawApiResponse>("lawService.do", { target: "law", MST: mst });
}
