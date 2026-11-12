import { prisma } from "@/shared/db";

const LIST_SIZE = 5;

export interface CaseListItem {
  id: string;
  caseNo: string;
  decidedAt: string;
  citedBy: number;
  examMarked: boolean;
}

const listSelect = { id: true, caseNo: true, decidedAt: true, citedBy: true, examMarked: true } as const;

/** 조문에 연결된 판례: 최신 5건, 주요 5건(기출 표시 → 인용 많은 순 → 최신순) */
export async function getCasesForArticle(lawId: string, articleKey: string) {
  const where = { articles: { some: { lawId, articleKey } } };
  const [recent, major, total] = await Promise.all([
    prisma.case.findMany({ where, orderBy: { decidedAt: "desc" }, take: LIST_SIZE, select: listSelect }),
    prisma.case.findMany({
      where: { ...where, OR: [{ examMarked: true }, { citedBy: { gt: 0 } }] },
      orderBy: [{ examMarked: "desc" }, { citedBy: "desc" }, { decidedAt: "desc" }],
      take: LIST_SIZE,
      select: listSelect,
    }),
    prisma.case.count({ where }),
  ]);
  return { recent, major, total };
}

export interface CaseDetail {
  id: string;
  caseNo: string;
  court: string;
  decidedAt: string;
  caseName: string;
  holdings: string;
  summary: string;
  refArticles: string;
  fullText: string;
  citedBy: number;
  examMarked: boolean;
  keySentences: string[];
}

export async function getCase(id: string): Promise<CaseDetail | null> {
  const c = await prisma.case.findUnique({ where: { id } });
  if (!c) return null;
  let keySentences: string[] = [];
  try {
    keySentences = c.keySentences ? (JSON.parse(c.keySentences) as string[]) : [];
  } catch {}
  return {
    id: c.id,
    caseNo: c.caseNo,
    court: c.court,
    decidedAt: c.decidedAt,
    caseName: c.caseName,
    holdings: c.holdings,
    summary: c.summary,
    refArticles: c.refArticles,
    fullText: c.fullText,
    citedBy: c.citedBy,
    examMarked: c.examMarked,
    keySentences,
  };
}
