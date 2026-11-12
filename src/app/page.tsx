import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const laws = await prisma.law.findMany({
    orderBy: { name: "asc" },
    include: { versions: { orderBy: { effectiveDate: "desc" }, take: 1 } },
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">법령</h1>
      {laws.length === 0 ? (
        <p className="text-muted">
          아직 불러온 법령이 없다. README의 실행 방법대로 <code>npm run law:parse</code>, <code>npm run law:import</code>를 먼저
          실행할 것.
        </p>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {laws.map((law) => (
            <li key={law.id}>
              <Link href={`/laws/${law.slug}`} className="flex items-baseline justify-between py-3 hover:text-accent">
                <span className="font-medium">{law.name}</span>
                <span className="text-sm text-muted">시행 {law.versions[0]?.effectiveDate}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
