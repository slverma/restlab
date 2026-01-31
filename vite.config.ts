import { build, type InlineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isWatch = process.argv.includes("--watch");

// Extension build config (Node.js/CommonJS for VS Code)
const extensionConfig: InlineConfig = {
  configFile: false,
  build: {
    lib: {
      entry: resolve(__dirname, "src/extension.ts"),
      formats: ["cjs"],
      fileName: () => "extension.js",
    },
    outDir: "dist",
    sourcemap: true,
    ssr: true,
    rollupOptions: {
      external: [
        "vscode",
        "path",
        "fs",
        "http",
        "https",
        "url",
        "stream",
        "zlib",
        "util",
        "events",
        "buffer",
        "querystring",
        "crypto",
        "os",
        "net",
        "tls",
        "assert",
      ],
    },
    minify: false,
    emptyOutDir: true,
    watch: isWatch ? {} : null,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
};

// Webview build config (browser/IIFE for webviews)
const createWebviewConfig = (
  name: string,
  format: "iife" | "es" = "iife",
  includeMonaco: boolean = false,
): InlineConfig => ({
  configFile: false,
  plugins: [
    react({
      jsxRuntime: "classic",
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, `src/webview/${name}/index.tsx`),
      formats: [format],
      fileName: () => "index.js",
      name: name.charAt(0).toUpperCase() + name.slice(1),
    },
    outDir: `dist/${name}`,
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "index.css";
          }
          return "[name][extname]";
        },
        // Inline dynamic imports for Monaco workers
        inlineDynamicImports: format === "iife",
      },
    },
    watch: isWatch ? {} : null,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  worker: {
    format: "iife",
    plugins: () => [],
  },
  // Optimize Monaco deps
  optimizeDeps: {
    include: includeMonaco ? ["monaco-editor"] : [],
  },
});

// Build all targets
async function buildAll() {
  if (isWatch) {
    console.log("Building in watch mode...");
  }

  console.log("Building extension...");
  await build(extensionConfig);

  console.log("Building sidebar webview...");
  await build(createWebviewConfig("sidebar"));

  console.log("Building editor webview...");
  await build(createWebviewConfig("editor"));

  console.log("Building request webview...");
  await build(createWebviewConfig("request", "iife", true));

  console.log("Build complete!");

  if (isWatch) {
    console.log("Watching for changes...");
  }
}

// Run build
buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
