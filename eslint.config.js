import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const frontendFiles = [
  "apps/portfolio/**/*.{ts,tsx}",
  "apps/weather/**/*.{ts,tsx}",
  "apps/seatpicker/**/*.{ts,tsx}",
  "packages/ui/**/*.{ts,tsx}",
];

export default defineConfig([
  globalIgnores(["**/dist", "**/coverage", "design"]),

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["vitest.config.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },

  {
    files: frontendFiles,
    extends: [reactHooks.configs.flat["recommended-latest"], reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },

  {
    files: ["apps/api/**/*.ts"],
    languageOptions: { globals: globals.node },
    rules: { "no-console": "off" },
  },
]);
