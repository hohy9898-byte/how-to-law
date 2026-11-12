import { NextResponse } from "next/server";
import { getCase } from "@/features/cases";

/** 판례 팝업용 상세. 판례 내용은 수집 뒤 바뀌지 않으므로 잠시 캐시해도 된다. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const data = await getCase((await params).id);
  if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
}
