// 공통 트리를 참조 목록과 함께 data/parsed/*.json으로 저장하고 요약을 출력한다.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { extractArticleRefs, listArticles } from "../../src/lib/law-parser/refs";
import type { ParsedLaw } from "../../src/lib/law-parser/types";

export function saveParsed(law: ParsedLaw, sourceFile: string, output: string) {
  const articles = listArticles(law.nodes);
  const refs = articles.flatMap(extractArticleRefs);

  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify({ ...law, sourceFile, refs }, null, 2), "utf8");

  console.log(`법령: ${law.name} (시행 ${law.effectiveDate ?? "알 수 없음"})`);
  console.log(`조: ${articles.length}개 (삭제 ${articles.filter((a) => a.isDeleted).length}, 가지 조문 ${articles.filter((a) => a.branch).length})`);
  console.log(`마지막 조: 제${articles.at(-1)?.key ?? "-"}조`);
  console.log(`참조: ${refs.length}개 (준용 ${refs.filter((r) => r.kind === "APPLY").length})`);
  console.log(`저장: ${output}`);
  if (!law.effectiveDate) console.warn("경고: 시행일을 찾지 못했습니다. import 전에 확인하세요.");
}
