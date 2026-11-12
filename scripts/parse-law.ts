// 사용법: npm run law:parse -- [입력 txt] [출력 json]
// 기본값: data/raw/민법.txt → data/parsed/민법.json
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parseLawText } from "../src/lib/law-parser/adapters/text";
import { extractArticleRefs, listArticles } from "../src/lib/law-parser/refs";

const input = process.argv[2] ?? "data/raw/민법.txt";
const output = process.argv[3] ?? join("data/parsed", basename(input).replace(/\.txt$/, ".json"));

const law = parseLawText(readFileSync(input, "utf8"));
const articles = listArticles(law.nodes);
const refs = articles.flatMap(extractArticleRefs);

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ ...law, sourceFile: basename(input), refs }, null, 2), "utf8");

const last = articles.at(-1);
console.log(`법령: ${law.name} (시행 ${law.effectiveDate ?? "알 수 없음"})`);
console.log(`조: ${articles.length}개 (삭제 ${articles.filter((a) => a.isDeleted).length}, 가지 조문 ${articles.filter((a) => a.branch).length})`);
console.log(`마지막 조: 제${last?.key ?? "-"}조`);
console.log(`참조: ${refs.length}개 (준용 ${refs.filter((r) => r.kind === "APPLY").length})`);
console.log(`저장: ${output}`);
if (!law.effectiveDate) console.warn("경고: [시행 YYYY. M. D.] 줄을 찾지 못했습니다. import 전에 확인하세요.");
