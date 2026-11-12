// 법령정보센터 API에서 받아 파싱. 사용법: npm run law:fetch -- [법령명]
// 기본값: 민법 → data/raw/api/민법.json(원본 응답), data/parsed/민법.json
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fetchLaw, findCurrentLaw } from "../src/features/law/api-client";
import { convertLawApi } from "../src/features/law/parser";
import { saveParsed } from "./lib/save-parsed";

try {
  process.loadEnvFile(".env");
} catch {
  // .env가 없으면 환경변수에서 바로 읽는다.
}

const name = process.argv[2] ?? "민법";

async function main() {
  const hit = await findCurrentLaw(name);
  console.log(`검색: ${hit.법령명한글} (MST ${hit.법령일련번호}, 시행 ${hit.시행일자})`);

  const raw = await fetchLaw(hit.법령일련번호);
  // 원본 응답도 남겨 둔다. 파서를 고쳤을 때 API를 다시 부르지 않고 확인하기 위해서.
  mkdirSync("data/raw/api", { recursive: true });
  const rawFile = join("data/raw/api", `${name}.json`);
  writeFileSync(rawFile, JSON.stringify(raw), "utf8");

  saveParsed(convertLawApi(raw), `api:MST=${hit.법령일련번호}`, join("data/parsed", `${name}.json`));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
