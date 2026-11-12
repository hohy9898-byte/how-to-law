// 텍스트·API 어댑터가 함께 쓰는 함수
import { DIVISION_LEVELS, type LawNode, type Level } from "../types";

export const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
export const SUBITEM_CHARS = "가나다라마바사아자차카타파하";

const DIVISION_UNIT: Record<string, Level> = { 편: "PART", 장: "CHAPTER", 절: "SECTION", 관: "SUBSECTION" };
const RE_DIVISION = /^제(\d+)(편|장|절|관)(?:의(\d+))?\s*(.*)$/;
// <개정 2011.3.7>, <신설 …>, 그리고 삭제 조문 뒤의 날짜만 있는 <2015.2.3>
const RE_INLINE_NOTE = /<(?:개정|신설|삭제|\d{4}\.)[^>]*>/g;

export function node(level: Level, number: number, branch: number, key: string, title: string | null): LawNode {
  return { level, number, branch, key, title, text: "", isDeleted: false, amendNotes: [], children: [] };
}

/** 본문에서 <개정 …> 표기를 떼어 낸다. */
export function splitNotes(raw: string): { text: string; notes: string[] } {
  const notes = raw.match(RE_INLINE_NOTE) ?? [];
  return { text: raw.replace(RE_INLINE_NOTE, "").trim(), notes };
}

export function appendText(target: LawNode, raw: string) {
  const { text, notes } = splitNotes(raw);
  target.amendNotes.push(...notes);
  if (text) target.text = target.text ? `${target.text}\n${text}` : text;
}

/** "제9절의2 여행계약 <신설 2015.2.3>" 같은 편·장·절·관 제목 줄. 아니면 null */
export function parseDivisionLine(line: string): LawNode | null {
  const m = line.trim().match(RE_DIVISION);
  if (!m) return null;
  const branch = m[3] ? Number(m[3]) : 0;
  const { text: title, notes } = splitNotes(m[4]);
  const div = node(DIVISION_UNIT[m[2]], Number(m[1]), branch, `제${m[1]}${m[2]}${branch ? `의${branch}` : ""}`, title || null);
  div.amendNotes.push(...notes);
  if (title.startsWith("삭제")) div.isDeleted = true;
  return div;
}

/** 편 > 장 > 절 > 관 순서를 지키며 노드를 붙인다. */
export class DivisionStack {
  roots: LawNode[] = [];
  private stack: (LawNode | null)[] = [null, null, null, null];

  current(): LawNode | null {
    return [...this.stack].reverse().find((d) => d) ?? null;
  }

  pushDivision(div: LawNode) {
    const rank = DIVISION_LEVELS.indexOf(div.level);
    for (let i = rank; i < this.stack.length; i++) this.stack[i] = null;
    this.attach(this.stack.slice(0, rank).reverse().find((d) => d) ?? null, div);
    this.stack[rank] = div;
  }

  /** 현재 편·장·절·관 아래(없으면 최상위)에 붙인다. */
  pushArticle(article: LawNode) {
    this.attach(this.current(), article);
  }

  private attach(parent: LawNode | null, child: LawNode) {
    (parent ? parent.children : this.roots).push(child);
  }
}
