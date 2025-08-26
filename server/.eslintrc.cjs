/* eslint-env node */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
  ],
  ignorePatterns: ["dist", "node_modules"],
  parserOptions: { sourceType: "module", ecmaVersion: "latest" },
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  }
};
