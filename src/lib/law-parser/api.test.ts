import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { convertLawApi, type LawApiResponse } from "./adapters/api";
import { extractArticleRefs, listArticles } from "./refs";

// 실제 API 응답(민법, 시행 2026-03-17)에서 일부 조문만 뽑은 샘플
const sample = JSON.parse(readFileSync(join(__dirname, "__fixtures__", "api-sample.json"), "utf8")) as LawApiResponse;
const law = convertLawApi(sample);
const articles = listArticles(law.nodes);
const get = (key: string) => articles.find((a) => a.key === key)!;

describe("convertLawApi", () => {
  it("법령명과 시행일", () => {
    expect(law.name).toBe("민법");
    expect(law.effectiveDate).toBe("2026-03-17");
  });

  it("편·장·절 계층과 개정 표기 분리", () => {
    expect(law.nodes.map((n) => `${n.key} ${n.title}`)).toEqual(["제1편 총칙", "제3편 채권", "제5편 상속"]);
    expect(law.nodes[2].amendNotes).toEqual(["<개정 1990.1.13>"]);
    const travel = law.nodes[1].children.find((c) => c.level === "SECTION")!;
    expect([travel.key, travel.title, travel.amendNotes]).toEqual(["제9절의2", "여행계약", ["<신설 2015.2.3>"]]);
  });

  it("조 머리를 떼고 항 번호를 분리한다", () => {
    const a2 = get("2");
    expect([a2.title, a2.text]).toEqual(["신의성실", ""]);
    expect(a2.children.map((p) => [p.key, p.number, p.text])).toEqual([
      ["①", 1, "권리의 행사와 의무의 이행은 신의에 좇아 성실히 하여야 한다."],
      ["②", 2, "권리는 남용하지 못한다."],
    ]);
  });

  it("조문참고자료를 개정 표기로", () => {
    expect(get("4").amendNotes).toEqual(["[전문개정 2011.3.7]"]);
    expect(get("4").text).toBe("사람은 19세로 성년에 이르게 된다.");
  });

  it("항 번호 없이 호만 있으면 호를 조에 붙인다 (항이 객체로 오는 경우)", () => {
    const a40 = get("40");
    expect(a40.children.map((c) => c.level)).toEqual(Array(7).fill("ITEM"));
    expect(a40.children[0]).toMatchObject({ key: "1.", number: 1, text: "목적" });
  });

  it("가지 조문, 삭제 조문", () => {
    expect([get("14의2").number, get("14의2").branch]).toEqual([14, 2]);
    expect(get("436")).toMatchObject({ isDeleted: true, title: null, text: "삭제", amendNotes: ["<2015.2.3>"] });
  });

  it("준용 참조", () => {
    expect(extractArticleRefs(get("1118"))).toEqual([
      { fromKey: "1118", toKey: "1001", kind: "APPLY" },
      { fromKey: "1118", toKey: "1008", kind: "APPLY" },
      { fromKey: "1118", toKey: "1010", kind: "APPLY" },
    ]);
  });
});
