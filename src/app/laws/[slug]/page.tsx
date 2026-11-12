import type { Metadata } from "next";
import Link from "next/link";
import { LawToolbar } from "@/components/LawToolbar";
import { prisma } from "@/lib/db";
import { DIVISIONS, articleHref, articleName, buildTree, getLaw, type TreeNode } from "@/lib/law";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: `${(await getLaw((await params).slug)).name} 목차` };
}

type Row = { id: string; parentId: string | null; level: string; key: string; title: string | null; isDeleted: boolean };

function TocNode({ node, slug }: { node: TreeNode<Row>; slug: string }) {
  if (node.level === "ARTICLE") {
    return (
      <li>
        <Link href={articleHref(slug, node.key)} className={`block py-0.5 hover:text-accent ${node.isDeleted ? "text-muted" : ""}`}>
          {articleName(node.key)}
          {node.title ? `(${node.title})` : node.isDeleted ? " 삭제" : ""}
        </Link>
      </li>
    );
  }
  return (
    <li>
      <details open={node.level === "PART"}>
        <summary className={`py-1 ${node.level === "PART" ? "font-semibold" : "font-medium"} ${node.isDeleted ? "text-muted" : ""}`}>
          {node.key} {node.title}
        </summary>
        <ul className="ml-4 border-l border-border pl-3">
          {node.children.map((c) => (
            <TocNode key={c.id} node={c} slug={slug} />
          ))}
        </ul>
      </details>
    </li>
  );
}

export default async function LawPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const law = await getLaw(slug);
  const rows = await prisma.provision.findMany({
    where: { versionId: law.version.id, level: { in: [...DIVISIONS, "ARTICLE"] } },
    orderBy: { seq: "asc" },
    select: { id: true, parentId: true, level: true, key: true, title: true, isDeleted: true },
  });
  const tree = buildTree(rows);

  return (
    <div>
      <h1 className="text-xl font-semibold">{law.name}</h1>
      <p className="mb-4 text-sm text-muted">시행 {law.version.effectiveDate}</p>
      <LawToolbar slug={slug} />
      <ul className="text-[15px]">
        {tree.map((n) => (
          <TocNode key={n.id} node={n} slug={slug} />
        ))}
      </ul>
    </div>
  );
}
