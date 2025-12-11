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
  },
};

// Request webview build config
const requestConfig = {
  entryPoints: ["./src/webview/request/index.tsx"],
  bundle: true,
  outfile: "./dist/request/index.js",
  format: "iife",
  platform: "browser",
  sourcemap: true,
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
    ".css": "css",
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
