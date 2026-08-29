import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
  },
  build: {
    target: "es2022",
    sourcemap: true,
    minify: false,
    lib: {
      entry: "src/app.tsx",
      formats: ["es"],
      fileName: () => "latent-fm.js",
    },
  },
});
