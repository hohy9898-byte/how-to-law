import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLawText } from "./adapters/text";
import { extractArticleRefs, listArticles, splitRefs } from "./refs";
import { articleSortKey } from "./types";
import { articleName, keyToParam, normalizeArticleKey } from "../keys";

const sample = readFileSync(join(__dirname, "__fixtures__", "sample.txt"), "utf8");
const law = parseLawText(sample);
const articles = listArticles(law.nodes);
const get = (key: string) => articles.find((a) => a.key === key)!;

describe("parseLawText", () => {
  it("법령명과 시행일", () => {
    expect(law.name).toBe("민법");
    expect(law.effectiveDate).toBe("2025-01-31");
  });

  it("편·장·절·관 계층", () => {
    expect(law.nodes.map((n) => n.key)).toEqual(["제1편", "제2편"]);
    const [part1] = law.nodes;
    expect(part1.children.map((c) => `${c.key} ${c.title}`)).toEqual(["제1장 통칙", "제2장 인"]);
    const chapter2 = part1.children[1];
    expect(chapter2.children.map((c) => c.key)).toEqual(["제1절", "제2절"]);
    expect(chapter2.children[1].children[0].level).toBe("SUBSECTION");
  });

  it("부칙은 건너뛴다", () => {
    expect(articles.map((a) => a.key)).toEqual(["1", "2", "3", "4", "5", "6", "7", "7의2", "18", "185"]);
  });

  it("항이 없는 조는 본문을 조에 둔다", () => {
    expect(get("1").text).toContain("관습법에 의하고");
    expect(get("1").children).toHaveLength(0);
  });

  it("항", () => {
    const a2 = get("2");
    expect(a2.title).toBe("신의성실");
    expect(a2.text).toBe("");
    expect(a2.children.map((p) => [p.key, p.number])).toEqual([["①", 1], ["②", 2]]);
    expect(a2.children[1].text).toBe("권리는 남용하지 못한다.");
  });

  it("삭제 조문", () => {
    expect(get("6").isDeleted).toBe(true);
    expect(get("6").title).toBeNull();
  });

  it("호·목과 개정 표기", () => {
    const a7 = get("7");
    expect(a7.text).toBe("다음 각 호의 어느 하나에 해당하는 경우에는 제5조를 준용한다.");
    expect(a7.amendNotes).toEqual(["<개정 2011. 3. 7.>"]);
    expect(a7.children.map((i) => i.key)).toEqual(["1.", "2.", "3."]);
    expect(a7.children[1].children.map((s) => [s.key, s.text])).toEqual([["가.", "첫째 목"], ["나.", "둘째 목"]]);
    expect(get("4").amendNotes).toEqual(["[전문개정 2011. 3. 7.]"]);
  });

  it("가지 조문", () => {
    const a = get("7의2");
    expect([a.number, a.branch]).toEqual([7, 2]);
    expect(articleSortKey(a.number, a.branch)).toBe(702);
    expect(a.amendNotes).toEqual(["[본조신설 2011. 3. 7.]"]);
  });
});

describe("law-keys", () => {
  it("조 번호 입력 정규화와 표기", () => {
    expect(["750", "750-2", "750의2", "제750조의2", " 제 750 조 "].map(normalizeArticleKey)).toEqual([
      "750", "750의2", "750의2", "750의2", "750",
    ]);
    expect(normalizeArticleKey("abc")).toBeNull();
    expect(articleName("7의2")).toBe("제7조의2");
    expect(keyToParam("7의2")).toBe("7-2");
  });
});

describe("refs", () => {
  it("준용과 참조를 구분하고 다른 법 조문은 뺀다", () => {
    expect(extractArticleRefs(get("7"))).toEqual([{ fromKey: "7", toKey: "5", kind: "APPLY" }]);
    expect(extractArticleRefs(get("7의2")).map((r) => [r.toKey, r.kind])).toEqual([["3", "REF"], ["4", "REF"]]);
  });

  it("splitRefs", () => {
    expect(splitRefs("제750조의2 및 「상법」 제1조")).toEqual([
      { type: "ref", value: "제750조의2", key: "750의2" },
      { type: "text", value: " 및 「상법」 제1조" },
    ]);
  });
});
