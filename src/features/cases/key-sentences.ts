// AI(Claude)로 판결요지의 핵심 구문을 원문 그대로 발췌한다 (요약 스크립트에서만 사용).
// 모델이 고친 문장은 keepVerbatim에서 걸러지므로, 저장되는 문장은 항상 원문의 일부다.
import Anthropic from "@anthropic-ai/sdk";
import { keepVerbatim } from "./verbatim";

export const KEY_MODEL = "claude-opus-5-5";
const MAX_SENTENCES = 2;

// 고정 문자열. 매 요청 같은 앞부분이라 프롬프트 캐싱 대상이 된다.
const SYSTEM = `너는 변리사·변호사 시험 민법 출제위원이다.
사용자가 대법원 판례의 판시사항과 판결요지를 준다.
판결요지에서 시험(선택형 지문, 사례형 답안)에 가장 자주 쓰이는 핵심 법리 문장을 ${MAX_SENTENCES}개 이하로 고른다.

규칙
- 판결요지에 있는 문장이나 구절을 글자 그대로 복사한다. 단어를 바꾸거나 줄이거나 합치지 않는다.
- 긴 문장은 핵심 법리가 담긴 연속된 구절만 잘라 와도 된다.
- 사실관계, 원심 판단, 사건 특유의 사정은 고르지 않는다. 일반 법리(요건, 효과, 판단 기준)를 고른다.
- "[1]" 같은 항목 번호는 넣지 않는다.
- 고를 만한 문장이 없으면 빈 배열을 돌려준다.`;

const SCHEMA = {
  type: "object",
  properties: { sentences: { type: "array", items: { type: "string" } } },
  required: ["sentences"],
  additionalProperties: false,
} as const;

export interface KeySentenceResult {
  sentences: string[];
  /** 실제로 답한 모델 (거절 시 다른 모델로 넘어갔으면 그 모델) */
  model: string;
  /** 모델이 냈지만 원문에 없어서 버린 문장 수 */
  dropped: number;
}

/** 판결요지에서 핵심 구문을 뽑는다. 판결요지가 없거나 모델이 거절하면 null */
export async function extractKeySentences(
  client: Anthropic,
  input: { holdings: string; summary: string },
): Promise<KeySentenceResult | null> {
  if (!input.summary.trim()) return null;

  const res = await client.beta.messages.create({
    model: KEY_MODEL,
    max_tokens: 4000,
    // 안전 분류기가 거절하면 같은 요청을 다른 모델로 다시 실행
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: `판시사항:\n${input.holdings}\n\n판결요지:\n${input.summary}` }],
  });

  if (res.stop_reason === "refusal") return null;
  const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  let raw: string[];
  try {
    raw = (JSON.parse(text) as { sentences: string[] }).sentences ?? [];
  } catch {
    return null;
  }
  const sentences = keepVerbatim(raw, input.summary).slice(0, MAX_SENTENCES);
  return { sentences, model: res.model, dropped: raw.length - sentences.length };
}
