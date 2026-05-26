import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    alias: {
      "@/": new URL("./src/", import.meta.url).pathname,
    },
    dir: "./src",
  },
});
