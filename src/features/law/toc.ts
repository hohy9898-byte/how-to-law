// 목차를 클라이언트로 보낼 때 쓰는 압축 형식 (DB 의존 없음, 클라이언트에서도 import 가능)
// 행 하나: [key, title, level, depth, isDeleted]
//   level: P(편) C(장) S(절) U(관) A(조), depth: 0부터

export type TocLevel = "P" | "C" | "S" | "U" | "A";
export type TocRow = [key: string, title: string | null, level: TocLevel, depth: number, deleted: 0 | 1];

export const TOC_LEVEL: Record<string, TocLevel> = {
  PART: "P",
  CHAPTER: "C",
  SECTION: "S",
  SUBSECTION: "U",
  ARTICLE: "A",
};
