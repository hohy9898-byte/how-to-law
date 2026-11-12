// 판례 수집. 사용법:
//   npm run cases:fetch -- 750,162,390      조 번호 목록
//   npm run cases:fetch -- --part 3         제3편 전체
//   옵션: --max 20 (조당 최신 판례 수), --leading 5 (조당 추가로 모을 리딩케이스 수)
// 원본 응답은 data/raw/cases/{id}.json에 저장하고, 있으면 다시 부르지 않는다 (중간에 끊겨도 다시 실행하면 이어짐).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { cleanText, fetchPrecedent, findByCaseNo, searchSupremeCourt, toIsoDate, type PrecedentDetail } from "../src/features/cases/api-client";
import { parseCitedCaseNos, parseRefArticles } from "../src/features/cases/ref-parser";

try {
  process.loadEnvFile(".env");
} catch {}

const LAW_NAME = "민법";
const RAW_DIR = "data/raw/cases";
const DELAY_MS = 200;

const args = process.argv.slice(2);
const opt = (name: string, def: number) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const MAX = opt("max", 20);
const LEADING = opt("leading", 5);
const PART = opt("part", 0);

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let apiCalls = 0;

async function getDetail(id: string): Promise<PrecedentDetail> {
  const file = join(RAW_DIR, `${id}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8")) as PrecedentDetail;
  await sleep(DELAY_MS);
  apiCalls++;
  const detail = await fetchPrecedent(id);
  writeFileSync(file, JSON.stringify(detail), "utf8");
  return detail;
}

/** 판례를 저장하고 참조조문에 나온 민법 조문과 연결한다. 연결된 조 키 목록을 돌려준다. */
async function saveCase(id: string, d: PrecedentDetail, lawId: string, articleKeys: Set<string>) {
  const data = {
    caseNo: d.사건번호.trim(),
    court: d.법원명.trim(),
    decidedAt: toIsoDate(d.선고일자),
    caseName: cleanText(d.사건명),
    holdings: cleanText(d.판시사항),
    summary: cleanText(d.판결요지),
    refArticles: cleanText(d.참조조문),
    refCases: cleanText(d.참조판례),
    fullText: cleanText(d.판례내용),
  };
  await prisma.case.upsert({ where: { id }, update: data, create: { id, ...data } });

  const keys = parseRefArticles(data.refArticles)
    .filter((c) => c.law === LAW_NAME && articleKeys.has(c.key))
    .map((c) => c.key);
  for (const articleKey of new Set(keys)) {
    await prisma.caseArticle.upsert({
      where: { caseId_lawId_articleKey: { caseId: id, lawId, articleKey } },
      update: {},
      create: { caseId: id, lawId, articleKey },
    });
  }
  return { keys, refCases: data.refCases };
}

async function targetKeys(versionId: string): Promise<string[]> {
  if (PART) {
    const parts = await prisma.provision.findMany({ where: { versionId, level: "PART" }, orderBy: { seq: "asc" } });
    const part = parts.find((p) => p.number === PART);
    if (!part) throw new Error(`제${PART}편이 없습니다.`);
    const next = parts.find((p) => p.seq > part.seq);
    const arts = await prisma.provision.findMany({
      where: { versionId, level: "ARTICLE", isDeleted: false, seq: { gt: part.seq, ...(next ? { lt: next.seq } : {}) } },
      orderBy: { seq: "asc" },
      select: { key: true },
    });
    return arts.map((a) => a.key);
  }
  // "--옵션 값"을 건너뛰고 남은 인자가 조 번호 목록
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) i++;
    else positional.push(args[i]);
  }
  const keys = positional.join(",").split(",").map((s) => s.trim()).filter(Boolean);
  if (!keys.length) throw new Error("조 번호(예: 750,162) 또는 --part N을 주세요.");
  return keys;
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true });
  const law = await prisma.law.findUniqueOrThrow({
    where: { name: LAW_NAME },
    include: { versions: { orderBy: { effectiveDate: "desc" }, take: 1 } },
  });
  const versionId = law.versions[0].id;
  const articleKeys = new Set(
    (await prisma.provision.findMany({ where: { versionId, level: "ARTICLE" }, select: { key: true } })).map((a) => a.key),
  );
  const keys = await targetKeys(versionId);
  console.log(`대상 조문 ${keys.length}개, 조당 최신 ${MAX}건 + 리딩케이스 ${LEADING}건`);

  for (const [i, key] of keys.entries()) {
    if (!articleKeys.has(key)) {
      console.log(`- 제${key}조: 없는 조문, 건너뜀`);
      continue;
    }
    const [no, branch] = key.split("의");
    const query = `${LAW_NAME} 제${no}조${branch ? `의${branch}` : ""}`;
    await sleep(DELAY_MS);
    apiCalls++;
    const hits = await searchSupremeCourt(query, MAX);

    // 1) 최신 판례
    let linked = 0;
    const citedCount = new Map<string, number>();
    for (const hit of hits) {
      const { keys: linkedKeys, refCases } = await saveCase(hit.판례일련번호, await getDetail(hit.판례일련번호), law.id, articleKeys);
      if (linkedKeys.includes(key)) {
        linked++;
        for (const caseNo of parseCitedCaseNos(refCases)) citedCount.set(caseNo, (citedCount.get(caseNo) ?? 0) + 1);
      }
    }

    // 2) 이 조문 판례들이 자주 인용한 판례 (오래된 리딩케이스)
    const leading = [...citedCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, LEADING);
    let leadingLinked = 0;
    for (const [caseNo] of leading) {
      const existing = await prisma.case.findUnique({ where: { caseNo }, select: { id: true } });
      let id = existing?.id;
      if (!id) {
        await sleep(DELAY_MS);
        apiCalls++;
        id = (await findByCaseNo(caseNo))?.판례일련번호;
      }
      if (!id) continue;
      const { keys: linkedKeys } = await saveCase(id, await getDetail(id), law.id, articleKeys);
      if (linkedKeys.includes(key)) leadingLinked++;
    }
    console.log(`[${i + 1}/${keys.length}] 제${key}조: 검색 ${hits.length}건 중 연결 ${linked}건, 리딩케이스 ${leadingLinked}/${leading.length}건`);
  }

  // 3) 인용 수 다시 계산 (수집한 전체 판례 기준)
  const all = await prisma.case.findMany({ select: { caseNo: true, refCases: true } });
  const counts = new Map<string, number>();
  for (const c of all) for (const no of parseCitedCaseNos(c.refCases)) counts.set(no, (counts.get(no) ?? 0) + 1);
  await prisma.case.updateMany({ data: { citedBy: 0 } });
  for (const [caseNo, n] of counts) await prisma.case.updateMany({ where: { caseNo }, data: { citedBy: n } });

  const top = await prisma.case.findMany({ orderBy: { citedBy: "desc" }, take: 5, select: { caseNo: true, citedBy: true, decidedAt: true } });
  console.log(`\n판례 ${all.length}건 저장, API 호출 ${apiCalls}회`);
  console.log("인용 많은 판례:", top.map((t) => `${t.caseNo}(${t.decidedAt}) ${t.citedBy}회`).join(", "));
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
