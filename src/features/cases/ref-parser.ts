// 판례 상세의 "참조조문"·"참조판례" 문자열 파싱 (DB 의존 없음)

export interface ArticleCite {
  law: string;
  /** "750", "750의2" */
  key: string;
}

/**
 * 참조조문을 (법령, 조) 목록으로 바꾼다.
 * 예: "[2] 자본시장과 금융투자업에 관한 법률 제4조 제3항, 민법 제750조 / [4] 민법 제393조, 제750조"
 * - 법 이름이 생략된 조는 앞에서 나온 법을 이어서 쓴다. 이 문맥은 "/"로 나뉜 구간마다 새로 시작한다.
 * - "구 민법(2011. 3. 7. 법률 제10429호로 개정되기 전의 것) 제9조" → 민법 제9조
 */
export function parseRefArticles(text: string): ArticleCite[] {
  const found = new Map<string, ArticleCite>();
  const segments = text
    .replace(/\[\d+\]/g, "/")
    .replace(/\([^)]*\)/g, " ")
    .split("/");

  for (const segment of segments) {
    let law: string | null = null;
    for (const piece of segment.split(",")) {
      const m = piece.match(/^(.*?)제(\d+)조(?:의(\d+))?/);
      if (!m) continue;
      const prefix = m[1].replace(/\s+/g, " ").trim().replace(/^구\s+/, "");
      if (prefix && prefix !== "같은 법" && prefix !== "동법") law = prefix;
      if (!law) continue;
      const key = m[3] ? `${Number(m[2])}의${Number(m[3])}` : String(Number(m[2]));
      found.set(`${law}:${key}`, { law, key });
    }
  }
  return [...found.values()];
}

/** 참조판례에서 사건번호를 뽑는다. 예: "대법원 2015. 12. 23. 선고 2013다40681 판결(공2016상, 179)" → ["2013다40681"] */
export function parseCitedCaseNos(text: string): string[] {
  const nos = text.match(/(?<![\d가-힣])\d{2,4}[가-힣]{1,3}\d+/g) ?? [];
  return [...new Set(nos)];
}
