// 법령정보센터에서 복사·저장한 텍스트를 공통 트리로 바꾼다.
import { DIVISION_LEVELS, articleKey, type LawNode, type Level, type ParsedLaw } from "../types";

const DIVISION_UNIT: Record<string, Level> = { 편: "PART", 장: "CHAPTER", 절: "SECTION", 관: "SUBSECTION" };
const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
const SUBITEM_CHARS = "가나다라마바사아자차카타파하";

const RE_DIVISION = /^제(\d+)(편|장|절|관)(?:의(\d+))?\s*(.*)$/;
// 제목(괄호)이 있거나 "삭제"인 경우만 조 머리로 본다. 본문이 "제5조에 따라…"로 시작하는 줄과 구분하기 위해서.
const RE_ARTICLE = /^제(\d+)조(?:의(\d+))?\s*(?:\(([^)]*)\)\s*(.*)|(삭제.*))$/;
const RE_PARAGRAPH = new RegExp(`^([${CIRCLED}])\\s*(.*)$`);
const RE_ITEM = /^(\d+)(?:의(\d+))?\.\s*(.*)$/;
const RE_SUBITEM = new RegExp(`^([${SUBITEM_CHARS}])\\.\\s*(.*)$`);
const RE_INLINE_NOTE = /<(?:개정|신설|삭제)[^>]*>/g;
const RE_LINE_NOTE = /^\[[^\]]*\]$/;
const RE_EFFECTIVE = /\[시행\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\]/;

function node(level: Level, number: number, branch: number, key: string, title: string | null): LawNode {
  return { level, number, branch, key, title, text: "", isDeleted: false, amendNotes: [], children: [] };
}

/** 본문에서 <개정 …> 표기를 떼어 낸다. */
function splitNotes(raw: string): { text: string; notes: string[] } {
  const notes = raw.match(RE_INLINE_NOTE) ?? [];
  return { text: raw.replace(RE_INLINE_NOTE, "").trim(), notes };
}

function appendText(target: LawNode, raw: string) {
  const { text, notes } = splitNotes(raw);
  target.amendNotes.push(...notes);
  if (text) target.text = target.text ? `${target.text}\n${text}` : text;
}

export function parseLawText(input: string): ParsedLaw {
  const lines = input
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, " ").trim())
    .filter((l) => l.length > 0);

  const name = lines[0] ?? "";
  let effectiveDate: string | null = null;

  const roots: LawNode[] = [];
  // 편·장·절·관 스택. 인덱스 = DIVISION_LEVELS 순서
  const divisions: (LawNode | null)[] = [null, null, null, null];
  let article: LawNode | null = null;
  let paragraph: LawNode | null = null;
  let item: LawNode | null = null;
  let last: LawNode | null = null;

  const currentDivision = () => [...divisions].reverse().find((d) => d) ?? null;
  const attach = (parent: LawNode | null, child: LawNode) => (parent ? parent.children : roots).push(child);

  for (const line of lines.slice(1)) {
    if (!effectiveDate) {
      const m = line.match(RE_EFFECTIVE);
      if (m) {
        effectiveDate = `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
        continue;
      }
    }

    // 부칙부터는 일단 건너뛴다.
    if (/^부\s*칙/.test(line)) break;

    let m: RegExpMatchArray | null;

    if ((m = line.match(RE_DIVISION))) {
      const level = DIVISION_UNIT[m[2]];
      const rank = DIVISION_LEVELS.indexOf(level);
      const branch = m[3] ? Number(m[3]) : 0;
      const { text: title, notes } = splitNotes(m[4]);
      const div = node(level, Number(m[1]), branch, `제${m[1]}${m[2]}${branch ? `의${branch}` : ""}`, title || null);
      div.amendNotes.push(...notes);
      if (title.startsWith("삭제")) div.isDeleted = true;
      for (let i = rank; i < divisions.length; i++) divisions[i] = null;
      attach(divisions.slice(0, rank).reverse().find((d) => d) ?? null, div);
      divisions[rank] = div;
      article = paragraph = item = null;
      last = div;
      continue;
    }

    if ((m = line.match(RE_ARTICLE))) {
      const number = Number(m[1]);
      const branch = m[2] ? Number(m[2]) : 0;
      const art = node("ARTICLE", number, branch, articleKey(number, branch), m[3]?.trim() || null);
      attach(currentDivision(), art);
      article = art;
      paragraph = item = null;
      last = art;
      if (m[5]) {
        art.isDeleted = true;
        appendText(art, m[5]);
        continue;
      }
      const rest = m[4]?.trim() ?? "";
      const p = rest.match(RE_PARAGRAPH);
      if (p) {
        paragraph = node("PARAGRAPH", CIRCLED.indexOf(p[1]) + 1, 0, p[1], null);
        appendText(paragraph, p[2]);
        art.children.push(paragraph);
        last = paragraph;
      } else if (rest) {
        appendText(art, rest);
      }
      continue;
    }

    if (RE_LINE_NOTE.test(line)) {
      (article ?? last)?.amendNotes.push(line);
      continue;
    }

    if (article && (m = line.match(RE_PARAGRAPH))) {
      paragraph = node("PARAGRAPH", CIRCLED.indexOf(m[1]) + 1, 0, m[1], null);
      appendText(paragraph, m[2]);
      if (/^삭제/.test(paragraph.text)) paragraph.isDeleted = true;
      article.children.push(paragraph);
      item = null;
      last = paragraph;
      continue;
    }

    if (article && (m = line.match(RE_ITEM))) {
      const branch = m[2] ? Number(m[2]) : 0;
      item = node("ITEM", Number(m[1]), branch, `${m[1]}${branch ? `의${branch}` : ""}.`, null);
      appendText(item, m[3]);
      if (/^삭제/.test(item.text)) item.isDeleted = true;
      (paragraph ?? article).children.push(item);
      last = item;
      continue;
    }

    if (item && (m = line.match(RE_SUBITEM))) {
      const sub = node("SUBITEM", SUBITEM_CHARS.indexOf(m[1]) + 1, 0, `${m[1]}.`, null);
      appendText(sub, m[2]);
      item.children.push(sub);
      last = sub;
      continue;
    }

    // 어디에도 맞지 않는 줄은 직전 노드 본문에 이어 붙인다.
    if (last && last.level !== "PART" && last.level !== "CHAPTER" && last.level !== "SECTION" && last.level !== "SUBSECTION") {
      appendText(last, line);
    }
  }

  return { name, effectiveDate, nodes: roots };
}
