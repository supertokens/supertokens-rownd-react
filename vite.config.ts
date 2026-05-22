import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import preserveDirectives from 'rollup-preserve-directives';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      outDir: 'dist',
    }),
    preserveDirectives(),
  ],
  build: {
    sourcemap: true,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: {
        main: resolve(__dirname, 'src/index.tsx'),
        next: resolve(__dirname, 'src/next/index.ts'),
        'next-server': resolve(__dirname, 'src/next/server/index.ts'),
      },
      // the proper extensions will be added
      fileName: 'rownd',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'next', 'jose'],
      output: {
        // Preserve directory structure
        entryFileNames: '[name].js',
        preserveModules: true,
      },
    },
  },
});
