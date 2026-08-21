import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  // 相対パスにすることで、リポジトリ名が未確定でも静的配置できる。
  base: "./",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
