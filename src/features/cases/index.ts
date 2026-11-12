// 판례 기능의 공개 진입점
// 주의: DB 조회가 섞여 있어 클라이언트 컴포넌트에서 import하면 안 된다.
export { getCase, getCasesForArticle, type CaseDetail, type CaseListItem } from "./queries";
export { CaseSection } from "./components/CaseSection";
export { parseCitedCaseNos, parseRefArticles, type ArticleCite } from "./ref-parser";
export { findVerbatim, keepVerbatim } from "./verbatim";
