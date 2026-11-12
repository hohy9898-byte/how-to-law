// 수집 파이프라인(scripts/)용 공개 진입점. DB·화면에 의존하지 않는다.
export * from "./types";
export { extractArticleRefs, listArticles, splitRefs, type TextSegment } from "./refs";
export { parseLawText } from "./adapters/text";
export { convertLawApi, type LawApiResponse } from "./adapters/api";
