import globals from "globals";
import importPlugin from "eslint-plugin-import";
import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import ts from "typescript-eslint";

export default ts.config([
  js.configs.recommended,
  ts.configs.recommended,
  importPlugin.flatConfigs.recommended,
  prettier,
  { ignores: ["**/node_modules/", "**/__fixtures__/"] },
  {
    settings: {
      "import/resolver": {
        typescript: true,
        node: true,
      },
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    files: [
      "**/*.ts",
      "**/*.tsx",
      "**/*.mts",
      "**/*.js",
      "**/*.jsx",
      "**/*.mjs",
    ],
    rules: {
      "@typescript-eslint/explicit-function-return-type": [
        "error",
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      "@typescript-eslint/no-empty-interface": [
        "error",
        {
          allowSingleExtends: true,
        },
      ],
      "import/named": ["off"],
      "import/order": [
        "error",
        {
          "newlines-between": "always",
          alphabetize: {
            order: "asc",
          },
        },
      ],
      "prefer-const": [
        "error",
        {
          destructuring: "all",
        },
      ],
    },
  },
]);
