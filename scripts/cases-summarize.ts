// 판례 핵심 구문 발췌 (Claude). 사용법: npm run cases:summarize -- [--limit 20]
// 아직 발췌하지 않은 판례를 인용 많은 순으로 처리한다. ANTHROPIC_API_KEY가 필요하다.
import Anthropic from "@anthropic-ai/sdk";
import { PrismaClient } from "@prisma/client";
import { KEY_MODEL, extractKeySentences } from "../src/features/cases/key-sentences";

try {
  process.loadEnvFile(".env");
} catch {}

const args = process.argv.slice(2);
const limitAt = args.indexOf("--limit");
const LIMIT = limitAt >= 0 ? Number(args[limitAt + 1]) : 20;

const prisma = new PrismaClient();

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.log("ANTHROPIC_API_KEY가 없어서 건너뜁니다. .env에 ANTHROPIC_API_KEY=... 를 넣고 다시 실행하세요.");
    console.log("핵심 구문이 없는 판례는 팝업에서 판시사항 첫 항목을 대신 보여 줍니다.");
    return;
  }
  const client = new Anthropic();
  const cases = await prisma.case.findMany({
    where: { keySentences: null, summary: { not: "" } },
    orderBy: [{ citedBy: "desc" }, { decidedAt: "desc" }],
    take: LIMIT,
    select: { id: true, caseNo: true, holdings: true, summary: true },
  });
  console.log(`대상 ${cases.length}건 (모델 ${KEY_MODEL})`);

  let done = 0;
  let dropped = 0;
  for (const c of cases) {
    try {
      const result = await extractKeySentences(client, { holdings: c.holdings, summary: c.summary });
      // 거절 등으로 결과가 없으면 빈 배열로 표시해서 다시 시도하지 않는다
      await prisma.case.update({
        where: { id: c.id },
        data: { keySentences: JSON.stringify(result?.sentences ?? []), keyModel: result?.model ?? "none" },
      });
      done++;
      dropped += result?.dropped ?? 0;
      console.log(`- ${c.caseNo}: ${result?.sentences.length ?? 0}문장${result?.dropped ? ` (원문에 없어 버림 ${result.dropped})` : ""}`);
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) {
        console.error("API 키가 올바르지 않습니다.");
        return;
      }
      if (e instanceof Anthropic.RateLimitError) {
        console.error("요청 한도에 걸렸습니다. 잠시 뒤 다시 실행하세요 (처리한 건은 저장됨).");
        return;
      }
      console.error(`- ${c.caseNo}: 실패 ${e instanceof Error ? e.message : e}`);
    }
  }
  console.log(`\n완료 ${done}건, 원문과 달라서 버린 문장 ${dropped}개`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
