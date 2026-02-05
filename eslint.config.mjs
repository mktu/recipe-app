import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // ファイルサイズ・複雑度のルール（肥大化防止）
  {
    rules: {
      // ファイルの最大行数（コメント・空行除く）
      "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }],
      // 関数の最大行数
      "max-lines-per-function": ["warn", { max: 50, skipBlankLines: true, skipComments: true }],
      // 循環的複雑度（if/for のネスト制限）
      "complexity": ["warn", 10],
    },
  },
  // 自動生成ファイルの除外
  {
    files: ["src/types/database.ts"],
    rules: {
      "max-lines": "off",
    },
  },
  // テストファイルの制限緩和
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },
  // スクリプトファイルの制限緩和
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
    },
  },
]);

export default eslintConfig;
