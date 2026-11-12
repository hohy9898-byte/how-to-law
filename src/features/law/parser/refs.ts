// 조문 본문에서 같은 법 안의 다른 조를 가리키는 표현(제○조, 제○조의○)을 찾는다.
import { articleKey, type ArticleRef, type LawNode } from "./types";

// 「가사소송법」 제2조처럼 다른 법을 가리키는 경우는 제외한다.
const RE_REF = /(」\s*)?제(\d+)조(?:의(\d+))?/g;

export type TextSegment = { type: "text"; value: string } | { type: "ref"; value: string; key: string };

/** 본문을 일반 텍스트와 조문 참조 조각으로 나눈다. 화면에서 링크를 만들 때 쓴다. */
export function splitRefs(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const m of text.matchAll(RE_REF)) {
    if (m[1]) continue;
    const start = m.index!;
    if (start > cursor) segments.push({ type: "text", value: text.slice(cursor, start) });
    segments.push({ type: "ref", value: m[0], key: articleKey(Number(m[2]), m[3] ? Number(m[3]) : 0) });
    cursor = start + m[0].length;
  }
  if (cursor < text.length) segments.push({ type: "text", value: text.slice(cursor) });
  return segments;
}

function collectText(node: LawNode): string[] {
  return [node.text, ...node.children.flatMap(collectText)].filter(Boolean);
}

/** 한 조(하위 항·호·목 포함)에서 다른 조로 가는 참조 목록 */
export function extractArticleRefs(article: LawNode): ArticleRef[] {
  const found = new Map<string, ArticleRef>();
  for (const text of collectText(article)) {
    // 문장 단위로 나눠서 "준용" 여부를 판단한다.
    for (const sentence of text.split(/(?<=다\.)\s*/)) {
      const kind = sentence.includes("준용") ? "APPLY" : "REF";
      for (const seg of splitRefs(sentence)) {
        if (seg.type !== "ref" || seg.key === article.key) continue;
        const prev = found.get(seg.key);
        if (!prev || (prev.kind === "REF" && kind === "APPLY")) {
          found.set(seg.key, { fromKey: article.key, toKey: seg.key, kind });
        }
      }
    }
  }
  return [...found.values()];
}

/** 트리 전체에서 조만 순서대로 꺼낸다. */
export function listArticles(nodes: LawNode[]): LawNode[] {
  return nodes.flatMap((n) => (n.level === "ARTICLE" ? [n] : listArticles(n.children)));
}
