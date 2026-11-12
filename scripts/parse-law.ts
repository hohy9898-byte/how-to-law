// 텍스트 파일에서 파싱. 사용법: npm run law:parse -- [입력 txt] [출력 json]
// 기본값: data/raw/민법.txt → data/parsed/민법.json
import { readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { parseLawText } from "../src/lib/law-parser/adapters/text";
import { saveParsed } from "./lib/save-parsed";

const input = process.argv[2] ?? "data/raw/민법.txt";
const output = process.argv[3] ?? join("data/parsed", basename(input).replace(/\.txt$/, ".json"));

saveParsed(parseLawText(readFileSync(input, "utf8")), basename(input), output);
