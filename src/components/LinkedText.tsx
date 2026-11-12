import Link from "next/link";
import { splitRefs } from "@/lib/law-parser/refs";
import { articleHref } from "@/lib/law-keys";

/** 본문 속 "제○조"를 링크로 바꾼다. 실제로 있는 조(known)만 링크한다. */
export function LinkedText({ text, slug, known }: { text: string; slug: string; known: Set<string> }) {
  return (
    <>
      {splitRefs(text).map((seg, i) =>
        seg.type === "ref" && known.has(seg.key) ? (
          <Link key={i} href={articleHref(slug, seg.key)} className="text-accent underline-offset-2 hover:underline">
            {seg.value}
          </Link>
        ) : (
          <span key={i}>{seg.value}</span>
        ),
      )}
    </>
  );
}
