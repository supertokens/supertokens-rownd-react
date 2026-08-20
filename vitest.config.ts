import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    coverage: {
      all: true,
      include: ['src/**/*'],
      exclude: ["test/**", "src/**/*.test.ts", "src/**/*.test.tsx", "node_modules/**"],
      clean: true,
      provider: "v8",
      reporter: ["lcovonly", "text", "html", "cobertura"],
      reportsDirectory: "./coverage",
    },
  }
});
