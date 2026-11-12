// 서버·클라이언트 양쪽에서 쓰는 조 번호 변환 함수 (DB 의존 없음)

/** URL에는 "750-2", DB에는 "750의2"로 둔다. */
export const keyToParam = (key: string) => key.replace("의", "-");

/** "750", "750-2", "750의2", "제750조의2" 모두 "750의2" 형태로 바꾼다. 형식이 틀리면 null */
export function normalizeArticleKey(input: string): string | null {
  let s = input;
  try {
    s = decodeURIComponent(input);
  } catch {}
  s = s.replace(/\s/g, "").replace(/^제/, "").replace(/조/, "");
  const m = s.match(/^(\d+)(?:(?:-|의)(\d+))?$/);
  if (!m) return null;
  const branch = m[2] ? Number(m[2]) : 0;
  return branch ? `${Number(m[1])}의${branch}` : String(Number(m[1]));
}

/** "750의2" → "제750조의2" */
export const articleName = (key: string) => {
  const [no, branch] = key.split("의");
  return `제${no}조${branch ? `의${branch}` : ""}`;
};

export const articleHref =(slug: string, key: string) => `/laws/${slug}/articles/${keyToParam(key)}`;
