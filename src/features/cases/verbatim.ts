// AI가 고른 문장이 원문에 글자 그대로 있는지 확인한다 (DB·SDK 의존 없음)

// 공백을 뺀 글자 수. 너무 짧은 조각("채권자는")은 핵심 구문으로 의미가 없다.
const MIN_LENGTH = 10;

/**
 * 공백 차이는 무시하고 원문에서 같은 문장을 찾는다.
 * 찾으면 원문의 해당 부분(공백까지 원문 그대로)을, 못 찾으면 null을 돌려준다.
 */
export function findVerbatim(sentence: string, source: string): string | null {
  const needle = sentence.replace(/\s+/g, "");
  if (needle.length < MIN_LENGTH) return null;

  // 원문에서 공백을 뺀 문자열과, 그 각 글자의 원래 위치
  const positions: number[] = [];
  let compact = "";
  for (let i = 0; i < source.length; i++) {
    if (!/\s/.test(source[i])) {
      compact += source[i];
      positions.push(i);
    }
  }
  const at = compact.indexOf(needle);
  if (at < 0) return null;
  return source.slice(positions[at], positions[at + needle.length - 1] + 1);
}

/** 원문에 있는 문장만 남긴다 (원문 표기로 바꿔서, 중복 제거) */
export function keepVerbatim(sentences: string[], source: string): string[] {
  const out: string[] = [];
  for (const s of sentences) {
    const hit = findVerbatim(s, source);
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}
