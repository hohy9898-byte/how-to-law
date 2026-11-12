import type { Metadata } from "next";
import Link from "next/link";
import { LawToolbar, getLaw } from "@/features/law";
import { SearchResults, searchArticles } from "@/features/search";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const law = await getLaw((await params).slug);
  const q = ((await searchParams).q ?? "").trim();
  return { title: q ? `"${q}" 검색 - ${law.name}` : `검색 - ${law.name}` };
}

export default async function LawSearchPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = ((await searchParams).q ?? "").trim();
  const law = await getLaw(slug);
  const results = await searchArticles([slug], q);

  return (
    <div>
      <p className="mb-2 text-sm text-muted">
        <Link href={`/laws/${slug}`} className="hover:text-accent">
          {law.name}
        </Link>{" "}
        › 검색
      </p>
      <LawToolbar slug={slug} query={q} />
      <SearchResults q={q} results={results} />
    </div>
  );
}
