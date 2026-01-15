const esbuild = require("esbuild");
const path = require("path");

const isWatch = process.argv.includes("--watch");

// Extension build config
const extensionConfig = {
  entryPoints: ["./src/extension.ts"],
  bundle: true,
  outfile: "./dist/extension.js",
  external: ["vscode"],
  format: "cjs",
  platform: "node",
  sourcemap: true,
};

// Sidebar webview build config
const sidebarConfig = {
  entryPoints: ["./src/webview/sidebar/index.tsx"],
  bundle: true,
  outfile: "./dist/sidebar/index.js",
  format: "iife",
  platform: "browser",
  sourcemap: true,
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
    ".css": "css",
    ".ttf": "file",
    ".woff": "file",
    ".woff2": "file",
  },
};

// Editor webview build config
const editorConfig = {
  entryPoints: ["./src/webview/editor/index.tsx"],
  bundle: true,
  outfile: "./dist/editor/index.js",
  format: "iife",
  platform: "browser",
  sourcemap: true,
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
    ".css": "css",
    ".ttf": "file",
    ".woff": "file",
    ".woff2": "file",
  },
};

// Request webview build config
const requestConfig = {
  entryPoints: {
    index: "./src/webview/request/index.tsx",
    "editor.worker":
      "./node_modules/monaco-editor/esm/vs/editor/editor.worker.js",
    "json.worker":
      "./node_modules/monaco-editor/esm/vs/language/json/json.worker.js",
    "css.worker":
      "./node_modules/monaco-editor/esm/vs/language/css/css.worker.js",
    "html.worker":
      "./node_modules/monaco-editor/esm/vs/language/html/html.worker.js",
    "ts.worker":
      "./node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js",
  },
  bundle: true,
  outdir: "./dist/request",
  entryNames: "[name]",
  format: "esm",
  platform: "browser",
  sourcemap: true,
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
    ".css": "css",
    ".ttf": "file",
    ".woff": "file",
    ".woff2": "file",
  },
};

async function build() {
  try {
    if (isWatch) {
      const extCtx = await esbuild.context(extensionConfig);
      const sidebarCtx = await esbuild.context(sidebarConfig);
      const editorCtx = await esbuild.context(editorConfig);
      const requestCtx = await esbuild.context(requestConfig);

      await Promise.all([
        extCtx.watch(),
        sidebarCtx.watch(),
        editorCtx.watch(),
        requestCtx.watch(),
      ]);

      console.log("Watching for changes...");
    } else {
      await Promise.all([
        esbuild.build(extensionConfig),
        esbuild.build(sidebarConfig),
        esbuild.build(editorConfig),
        esbuild.build(requestConfig),
      ]);
      console.log("Build complete!");
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

build();
