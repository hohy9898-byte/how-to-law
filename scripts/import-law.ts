// 사용법: npm run law:import -- [json] [slug]
// 기본값: data/parsed/민법.json, slug는 아래 표에서 찾는다.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { articleSortKey, type ArticleRef, type LawNode, type ParsedLaw } from "../src/lib/law-parser/types";

const SLUGS: Record<string, string> = { 민법: "civil" };

const file = process.argv[2] ?? "data/parsed/민법.json";
const data = JSON.parse(readFileSync(file, "utf8")) as ParsedLaw & { sourceFile?: string; refs: ArticleRef[] };
const slug = process.argv[3] ?? SLUGS[data.name];
if (!slug) throw new Error(`"${data.name}"의 slug가 없습니다. 두 번째 인자로 넘기거나 SLUGS에 추가하세요.`);
if (!data.effectiveDate) throw new Error("시행일이 없습니다. 원문 파일의 [시행 …] 줄을 확인하세요.");

type Row = {
  id: string; versionId: string; parentId: string | null; articleId: string | null;
  level: string; number: number; branch: number; key: string; sortKey: number; seq: number;
  title: string | null; text: string; isDeleted: boolean; amendNote: string | null;
};

const prisma = new PrismaClient();

async function main() {
  const law = await prisma.law.upsert({ where: { name: data.name }, update: { slug }, create: { name: data.name, slug } });
  // 같은 시행일 버전이 있으면 지우고 다시 넣는다 (하위 조문은 cascade로 삭제)
  await prisma.lawVersion.deleteMany({ where: { lawId: law.id, effectiveDate: data.effectiveDate! } });
  const version = await prisma.lawVersion.create({
    data: { lawId: law.id, effectiveDate: data.effectiveDate!, sourceFile: data.sourceFile },
  });

  const rows: Row[] = [];
  const articleIds = new Map<string, string>();
  let seq = 0;
  const walk = (n: LawNode, parentId: string | null, articleId: string | null) => {
    const id = randomUUID();
    const isArticle = n.level === "ARTICLE";
    if (isArticle) articleIds.set(n.key, id);
    rows.push({
      id, versionId: version.id, parentId, articleId, level: n.level, number: n.number, branch: n.branch,
      key: n.key, sortKey: isArticle ? articleSortKey(n.number, n.branch) : 0, seq: seq++,
      title: n.title, text: n.text, isDeleted: n.isDeleted, amendNote: n.amendNotes.join("\n") || null,
    });
    n.children.forEach((c) => walk(c, id, isArticle ? id : articleId));
  };
  data.nodes.forEach((n) => walk(n, null, null));

  // 부모가 먼저 들어가도록 seq 순서대로 나눠 넣는다.
  for (let i = 0; i < rows.length; i += 500) {
    await prisma.provision.createMany({ data: rows.slice(i, i + 500) });
  }

  const refs = data.refs
    .filter((r) => articleIds.has(r.fromKey) && articleIds.has(r.toKey))
    .map((r) => ({ fromId: articleIds.get(r.fromKey)!, toId: articleIds.get(r.toKey)!, kind: r.kind }));
  for (let i = 0; i < refs.length; i += 500) {
    await prisma.provisionRef.createMany({ data: refs.slice(i, i + 500) });
  }

  const missing = data.refs.length - refs.length;
  console.log(`${data.name} (${slug}) 시행 ${data.effectiveDate}: 조문 ${rows.length}행, 참조 ${refs.length}개 저장`);
  if (missing) console.log(`대상 조문이 없어 건너뛴 참조: ${missing}개`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
