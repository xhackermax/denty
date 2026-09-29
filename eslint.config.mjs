import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    ".artifacts/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "public/games/**",
    "next-env.d.ts",
  ]),
  eslintConfigPrettier,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@next/next/no-img-element": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "off",
        {
          patterns: [
            {
              group: [
                "react",
                "react/*",
                "next",
                "next/*",
                "@/app/*",
                "@/features/*",
                "@/shared/*",
              ],
              message:
                "domain debe ser TypeScript puro y no depender de app, features, shared, React o Next.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "off",
        {
          patterns: [
            {
              group: ["@/app/*", "@/features/*"],
              message: "shared no puede depender de app ni de features.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "off",
        {
          patterns: [
            {
              group: ["@/features/*"],
              message: "Una feature no importa otra feature; eleva lo compartido a shared/domain.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
