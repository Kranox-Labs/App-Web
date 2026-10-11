import eslint from "@eslint/js";
import { defineConfig } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/"] },
  eslint.configs.recommended,
  tseslint.configs.strict,
  reactHooks.configs.flat.recommended,
);
