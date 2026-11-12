// 법률 종류나 입력 형식(텍스트 파일, API)에 상관없이 쓰는 공통 트리 구조.
// 입력 어댑터(adapters/*)는 모두 이 형태로 변환한다.

export type Level =
  | "PART" // 편
  | "CHAPTER" // 장
  | "SECTION" // 절
  | "SUBSECTION" // 관
  | "ARTICLE" // 조
  | "PARAGRAPH" // 항
  | "ITEM" // 호
  | "SUBITEM"; // 목

export const DIVISION_LEVELS: Level[] = ["PART", "CHAPTER", "SECTION", "SUBSECTION"];

export interface LawNode {
  level: Level;
  /** 번호. 조: 750, 항: 1(①), 호: 1, 목: 1(가) */
  number: number;
  /** 가지 번호. 제750조의2 → 2, 없으면 0 */
  branch: number;
  /** 표시용 키. 조: "750의2", 항: "①", 호: "1.", 목: "가.", 편·장: "제1편" */
  key: string;
  title: string | null;
  text: string;
  isDeleted: boolean;
  /** <개정 2011. 3. 7.>, [전문개정 2011. 3. 7.] 같은 표기 */
  amendNotes: string[];
  children: LawNode[];
}

export interface ParsedLaw {
  name: string;
  /** 시행일 YYYY-MM-DD, 모르면 null */
  effectiveDate: string | null;
  nodes: LawNode[];
}

export interface ArticleRef {
  fromKey: string;
  toKey: string;
  kind: "REF" | "APPLY";
}

/** 조 정렬 키: 750의2 → 75002 */
export function articleSortKey(number: number, branch: number): number {
  return number * 100 + branch;
}

/** 조 키: (750, 2) → "750의2" */
export function articleKey(number: number, branch: number): string {
  return branch ? `${number}의${branch}` : String(number);
}
