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
    // Design SSOT prototypes (docs/design/) are standalone .html/.js design
    // artifacts, not app source (see CLAUDE.md design↔implementation
    // convention) — exclude them from the app lint.
    "docs/design/**",
  ]),
]);

export default eslintConfig;
