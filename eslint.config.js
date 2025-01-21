// eslint.config.js
import { defineConfig } from "eslint-config";

export default defineConfig([
  {
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    env: {
      node: true,
      es2021: true,
    },
    parserOptions: {
      ecmaVersion: 12,
      sourceType: "module",
    },
    rules: {
      semi: ["error", "always"],
    },
  },
  {
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  },
]);
