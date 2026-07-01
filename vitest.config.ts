import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    include: ["lib/**/__tests__/**/*.test.ts", "lib/**/__tests__/**/*.test.tsx"],
    exclude: ["**/node_modules/**", ".next/**", "public/**"],
  },
  resolve: {
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
});
