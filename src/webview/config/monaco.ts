import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

// For VS Code webviews, we need to completely disable web workers
// since they cannot load external scripts due to CSP restrictions.
// This is set BEFORE Monaco loads to prevent worker creation attempts.
(self as any).MonacoEnvironment = {
  // Return undefined to disable workers entirely
  // Monaco will run language services synchronously on main thread
  getWorker: () => undefined,
};

// Configure Monaco to use local bundle instead of CDN
loader.config({ monaco });

// Register a dark theme that matches VS Code
monaco.editor.defineTheme("restlab-dark", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6A9955" },
    { token: "keyword", foreground: "569CD6" },
    { token: "string", foreground: "CE9178" },
    { token: "number", foreground: "B5CEA8" },
    { token: "type", foreground: "4EC9B0" },
  ],
  colors: {
    "editor.background": "#1e1e1e",
    "editor.foreground": "#d4d4d4",
    "editor.lineHighlightBackground": "#2d2d2d",
    "editor.selectionBackground": "#264f78",
    "editorCursor.foreground": "#aeafad",
    "editorWhitespace.foreground": "#3b3b3b",
  },
});

export { monaco };
