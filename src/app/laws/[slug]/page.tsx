import type { Metadata } from "next";
import { LawToolbar, TocTree, getLaw, getTocRows } from "@/features/law";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: `${(await getLaw((await params).slug)).name} 목차` };
}

export default async function LawPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const law = await getLaw(slug);
  const rows = await getTocRows(law.version.id);

  return (
    <div>
      <h1 className="text-xl font-semibold">{law.name}</h1>
      <p className="mb-4 text-sm text-muted">시행 {law.version.effectiveDate}</p>
      <LawToolbar slug={slug} />
      <TocTree slug={slug} rows={rows} />
    </div>
  );
}
