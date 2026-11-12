// 판례에 "기출" 표시를 켜고 끈다. 사용법: npm run cases:mark -- 2013다40681 [다른사건번호 ...] [--off]
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const off = args.includes("--off");
const caseNos = args.filter((a) => !a.startsWith("--"));
const prisma = new PrismaClient();

async function main() {
  if (!caseNos.length) throw new Error("사건번호를 주세요. 예: npm run cases:mark -- 2013다40681");
  for (const caseNo of caseNos) {
    const r = await prisma.case.updateMany({ where: { caseNo }, data: { examMarked: !off } });
    console.log(r.count ? `${caseNo}: 기출 표시 ${off ? "해제" : "설정"}` : `${caseNo}: 수집된 판례가 아닙니다 (먼저 cases:fetch)`);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
