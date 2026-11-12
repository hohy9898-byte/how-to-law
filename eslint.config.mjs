import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// 기능 경계 규칙. 다른 기능은 index.ts(공개 진입점)로만 쓰고, 의존 방향을 지킨다.
//   shared ← law ← search, study, cases    auth는 shared만 사용, study는 auth도 사용
// flat config에서는 같은 규칙을 뒤에서 다시 정하면 덮어쓰므로, 폴더별 설정에 공통 패턴을 함께 넣는다.
const DEEP_IMPORT = {
  group: ["@/features/*/*"],
  message: "다른 기능은 '@/features/<기능>'(index.ts)으로만 import하세요. 같은 기능 안에서는 상대 경로를 쓰세요.",
};
const noImport = (...names) =>
  names.map((n) => ({ group: [`@/features/${n}`], message: `이 폴더에서는 ${n} 기능을 쓰지 않습니다 (의존 방향 규칙).` }));
const boundary = (files, ...patterns) => ({
  files,
  rules: { "no-restricted-imports": ["error", { patterns: [DEEP_IMPORT, ...patterns] }] },
});
const NO_APP = { group: ["@/app/*"], message: "기능 코드는 app/에 의존하지 않습니다." };

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  boundary(["src/**/*.{ts,tsx}"]),
  boundary(["src/shared/**/*.{ts,tsx}"], NO_APP, { group: ["@/features/*"], message: "shared는 기능에 의존하지 않습니다." }),
  boundary(["src/features/law/**/*.{ts,tsx}"], NO_APP, ...noImport("search", "study", "auth", "cases")),
  boundary(["src/features/auth/**/*.{ts,tsx}"], NO_APP, ...noImport("law", "search", "study", "cases")),
  boundary(["src/features/search/**/*.{ts,tsx}"], NO_APP, ...noImport("study", "auth", "cases")),
  boundary(["src/features/study/**/*.{ts,tsx}"], NO_APP, ...noImport("search", "cases")),
  boundary(["src/features/cases/**/*.{ts,tsx}"], NO_APP, ...noImport("search", "study", "auth")),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
];

export default eslintConfig;
