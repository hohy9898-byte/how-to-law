import Link from "next/link";
import { prisma } from "@/lib/db";

/** 법령 카드 목록. 카드 전체가 목차로 가는 링크 */
export async function LawCards() {
  const laws = await prisma.law.findMany({
    orderBy: { name: "asc" },
    include: { versions: { orderBy: { effectiveDate: "desc" }, take: 1 } },
  });
  const counts = await Promise.all(
    laws.map((l) =>
      l.versions[0]
        ? prisma.provision.count({ where: { versionId: l.versions[0].id, level: "ARTICLE", isDeleted: false } })
        : 0,
    ),
  );

  if (laws.length === 0) {
    return (
      <p className="rounded border border-dashed border-border p-6 text-center text-muted">
        아직 불러온 법령이 없습니다. README의 실행 방법대로 <code>npm run law:fetch</code>, <code>npm run law:import</code>를 먼저
        실행하세요.
      </p>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {laws.map((law, i) => (
        <li key={law.id}>
          <Link
            href={`/laws/${law.slug}`}
            className="group block rounded-lg border border-border p-4 transition hover:border-accent hover:shadow-sm"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-semibold group-hover:text-accent">{law.name}</span>
              <span className="text-sm text-muted group-hover:text-accent">목차 보기 →</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              시행 {law.versions[0]?.effectiveDate} · 조문 {counts[i].toLocaleString()}개
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
