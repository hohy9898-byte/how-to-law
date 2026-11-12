// 국가법령정보센터 Open API(lawService.do, type=JSON) 응답을 공통 트리로 바꾼다.
import { articleKey, type LawNode, type ParsedLaw } from "../types";
import { CIRCLED, DivisionStack, SUBITEM_CHARS, appendText, node, parseDivisionLine } from "./common";

// 응답에서 쓰는 필드만 적는다.
type One<T> = T | T[] | undefined;
interface ApiSubItem { 목번호?: string; 목내용?: string }
interface ApiItem { 호번호?: string; 호가지번호?: string; 호내용?: string; 목?: One<ApiSubItem> }
interface ApiParagraph { 항번호?: string; 항내용?: string; 호?: One<ApiItem> }
interface ApiUnit {
  조문번호: string;
  조문가지번호?: string;
  조문여부: "조문" | "전문";
  조문제목?: string;
  조문내용: string;
  조문참고자료?: string;
  항?: One<ApiParagraph>;
}
export interface LawApiResponse {
  법령: {
    기본정보: { 법령명_한글: string; 시행일자: string };
    조문: { 조문단위: One<ApiUnit> };
  };
}

/** 항목이 하나면 배열이 아니라 객체로 오는 경우가 있어서 항상 배열로 맞춘다. */
const list = <T>(v: One<T>): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** 본문 앞에 붙어 오는 번호("①", "1.", "가.")를 뗀다. */
const stripPrefix = (text: string, prefix: string) => {
  const t = text.trim();
  return t.startsWith(prefix) ? t.slice(prefix.length).trim() : t;
};

/** "[전문개정 2011.3.7][본조신설 …]" → ["[전문개정 2011.3.7]", "[본조신설 …]"] */
const splitRefNotes = (s?: string) => s?.match(/\[[^\]]*\]/g) ?? [];

function toItem(raw: ApiItem): LawNode {
  const no = (raw.호번호 ?? "").trim();
  const m = no.match(/^(\d+)(?:의(\d+))?/);
  const number = m ? Number(m[1]) : 0;
  const branch = m?.[2] ? Number(m[2]) : raw.호가지번호 ? Number(raw.호가지번호) : 0;
  const item = node("ITEM", number, branch, `${number}${branch ? `의${branch}` : ""}.`, null);
  appendText(item, stripPrefix(raw.호내용 ?? "", no));
  if (/^삭제/.test(item.text)) item.isDeleted = true;
  for (const s of list(raw.목)) {
    const key = (s.목번호 ?? "").trim();
    const sub = node("SUBITEM", SUBITEM_CHARS.indexOf(key.charAt(0)) + 1, 0, key, null);
    appendText(sub, stripPrefix(s.목내용 ?? "", key));
    item.children.push(sub);
  }
  return item;
}

function toArticle(u: ApiUnit): LawNode {
  const number = Number(u.조문번호);
  const branch = u.조문가지번호 ? Number(u.조문가지번호) : 0;
  const title = u.조문제목?.trim() || null;
  const art = node("ARTICLE", number, branch, articleKey(number, branch), title);

  // 조문내용 = "제2조(신의성실)" 또는 "제750조(불법행위의 내용) 본문…" 또는 "제436조 삭제 <2015.2.3>"
  let body = u.조문내용.trim().replace(/^제\d+조(?:의\d+)?\s*/, "");
  if (title && body.startsWith(`(${title})`)) body = body.slice(title.length + 2).trim();
  appendText(art, body);
  if (/^삭제/.test(art.text)) art.isDeleted = true;
  art.amendNotes.push(...splitRefNotes(u.조문참고자료));

  for (const p of list(u.항)) {
    const no = (p.항번호 ?? "").trim();
    // 항 번호 없이 호만 있으면 호를 조에 바로 붙인다 (예: 제40조).
    let parent = art;
    if (no) {
      const para = node("PARAGRAPH", CIRCLED.indexOf(no) + 1, 0, no, null);
      appendText(para, stripPrefix(p.항내용 ?? "", no));
      if (/^삭제/.test(para.text)) para.isDeleted = true;
      art.children.push(para);
      parent = para;
    } else if (p.항내용) {
      appendText(art, p.항내용);
    }
    parent.children.push(...list(p.호).map(toItem));
  }
  return art;
}

export function convertLawApi(json: LawApiResponse): ParsedLaw {
  const info = json.법령.기본정보;
  const d = info.시행일자;
  const tree = new DivisionStack();

  for (const u of list(json.법령.조문.조문단위)) {
    if (u.조문여부 === "전문") {
      const div = parseDivisionLine(u.조문내용);
      if (div) tree.pushDivision(div);
    } else {
      tree.pushArticle(toArticle(u));
    }
  }

  return {
    name: info.법령명_한글.trim(),
    effectiveDate: /^\d{8}$/.test(d) ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null,
    nodes: tree.roots,
  };
}
