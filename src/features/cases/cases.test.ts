import { describe, expect, it } from "vitest";
import { parseCitedCaseNos, parseRefArticles } from "./ref-parser";
import { findVerbatim, keepVerbatim } from "./verbatim";

// 실제 API 응답(대법원 2026. 4. 30. 선고 2023다216388)에서 가져온 문자열
const REF_ARTICLES =
  " [1] 민법 제404조 제1항 / [2] 자본시장과 금융투자업에 관한 법률 제4조 제3항, 제9조 제11항, 민법 제750조 / [3] 민법 제750조 / [4] 민법 제393조, 제750조, 제763조 / [5] 민법 제393조, 제750조, 제763조          ";
const REF_CASES =
  " [1] 대법원 2020. 5. 21. 선고 2018다879 전원합의체 판결(공2020하, 1175) / [3] 대법원 2015. 12. 23. 선고 2013다40681 판결(공2016상, 179) / [4] 대법원 1992. 6. 23. 선고 91다33070 전원합의체 판결(공1992, 2235)";

describe("parseRefArticles", () => {
  it("법 이름이 생략된 조는 앞의 법을 이어 쓴다", () => {
    const cites = parseRefArticles(REF_ARTICLES);
    expect(cites.filter((c) => c.law === "민법").map((c) => c.key)).toEqual(["404", "750", "393", "763"]);
    expect(cites.filter((c) => c.law !== "민법")).toEqual([
      { law: "자본시장과 금융투자업에 관한 법률", key: "4" },
      { law: "자본시장과 금융투자업에 관한 법률", key: "9" },
    ]);
  });

  it("구법 표기와 괄호, 가지 조문", () => {
    expect(parseRefArticles("구 민법(2011. 3. 7. 법률 제10429호로 개정되기 전의 것) 제9조, 제14조의2")).toEqual([
      { law: "민법", key: "9" },
      { law: "민법", key: "14의2" },
    ]);
  });

  it("구간이 바뀌면 법 문맥을 새로 시작한다", () => {
    expect(parseRefArticles("[1] 상법 제24조 / [2] 제750조")).toEqual([{ law: "상법", key: "24" }]);
  });
});

describe("parseCitedCaseNos", () => {
  it("사건번호만 뽑고 공보 표기는 무시한다", () => {
    expect(parseCitedCaseNos(REF_CASES)).toEqual(["2018다879", "2013다40681", "91다33070"]);
  });
});

describe("verbatim", () => {
  const source = "채권자는 자기의 채권을 보전하기 위하여 일신에 전속한 권리가 아닌 한 채무자의 권리를  행사할 수 있다.";

  it("공백 차이는 무시하고 원문 표기로 돌려준다", () => {
    expect(findVerbatim("채무자의 권리를 행사할 수 있다.", source)).toBe("채무자의 권리를  행사할 수 있다.");
  });

  it("원문에 없거나 너무 짧은 문장은 버린다", () => {
    expect(findVerbatim("채권자는 언제나 채무자의 권리를 행사할 수 있다.", source)).toBeNull();
    expect(findVerbatim("채권자는", source)).toBeNull();
    expect(keepVerbatim(["지어낸 문장으로 원문에는 없는 내용입니다.", "일신에 전속한 권리가 아닌 한"], source)).toEqual([
      "일신에 전속한 권리가 아닌 한",
    ]);
  });
});
