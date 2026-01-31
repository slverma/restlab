import React, { useEffect, useRef } from "react";

import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import "monaco-editor/esm/vs/language/json/monaco.contribution.js";
import "monaco-editor/esm/vs/language/html/monaco.contribution.js";
import "monaco-editor/esm/vs/language/css/monaco.contribution.js";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution.js";

const editorWorkerUrl = new URL("editor.worker.js", import.meta.url);
const jsonWorkerUrl = new URL("json.worker.js", import.meta.url);
const cssWorkerUrl = new URL("css.worker.js", import.meta.url);
const htmlWorkerUrl = new URL("html.worker.js", import.meta.url);
const tsWorkerUrl = new URL("ts.worker.js", import.meta.url);

let monacoConfigured = false;

const configureMonaco = () => {
  if (monacoConfigured) return;
  monacoConfigured = true;

  (
    self as unknown as { MonacoEnvironment?: monaco.Environment }
  ).MonacoEnvironment = {
    getWorker: (_moduleId: string, label: string) => {
      switch (label) {
        case "json":
          return new Worker(jsonWorkerUrl);
        case "css":
        case "scss":
        case "less":
          return new Worker(cssWorkerUrl);
        case "html":
        case "handlebars":
        case "razor":
          return new Worker(htmlWorkerUrl);
        case "typescript":
        case "javascript":
          return new Worker(tsWorkerUrl);
        default:
          return new Worker(editorWorkerUrl);
      }
    },
  };

  monaco.languages.setLanguageConfiguration("json", {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"],
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
    ],
  });

  monaco.editor.defineTheme("restlab-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#1e1e1e",
      "editorLineNumber.foreground": "#6b7280",
      "editorLineNumber.activeForeground": "#d1d5db",
      "editorGutter.foldingControlForeground": "#c0c0c0",
    },
  });

  monaco.editor.setTheme("restlab-dark");
};

type MonacoEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  language: string;
  readOnly?: boolean;
  showHint?: string;
  formatOnChange?: boolean;
  editorInstanceRef?: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
};

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  placeholder,
  className,
  language,
  readOnly = false,
  showHint,
  formatOnChange = false,
  editorInstanceRef,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const modelRef = useRef<monaco.editor.ITextModel | null>(null);
  const isExternalUpdate = useRef(false);
  const isFormatting = useRef(false);
  const formatTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    configureMonaco();

    const model = monaco.editor.createModel(value, language);
    modelRef.current = model;

    const editor = monaco.editor.create(editorRef.current, {
      model,
      theme: "restlab-dark",
      readOnly,
      domReadOnly: readOnly,
      lineNumbers: "on",
      folding: true,
      showFoldingControls: "always",
      foldingStrategy: "indentation",
      foldingHighlight: true,
      glyphMargin: false,
      lineDecorationsWidth: 10,
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
      renderLineHighlight: "all",
      selectionHighlight: true,
      occurrencesHighlight: "singleFile",
      matchBrackets: "always",
      wordWrap: "on",
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
      automaticLayout: true,
      tabSize: 2,
      renderValidationDecorations: "on",
      formatOnType: !readOnly && formatOnChange,
      formatOnPaste: !readOnly && formatOnChange,
      contextmenu: true,
      quickSuggestions: false,
    });

    monacoRef.current = editor;
    if (editorInstanceRef) {
      editorInstanceRef.current = editor;
    }

    const changeDisposable = editor.onDidChangeModelContent(() => {
      if (isExternalUpdate.current) return;
      const nextValue = editor.getValue();
      onChange?.(nextValue);

      if (formatOnChange && !readOnly && !isFormatting.current) {
        if (formatTimer.current) {
          window.clearTimeout(formatTimer.current);
        }
        formatTimer.current = window.setTimeout(async () => {
          const editorInstance = monacoRef.current;
          if (!editorInstance) return;
          isFormatting.current = true;
          const formatAction = editorInstance.getAction(
            "editor.action.formatDocument",
          );
          if (formatAction) {
            await formatAction.run();
          }
          isFormatting.current = false;
        }, 450);
      }
    });

    // Add custom paste handler for webview clipboard access
    const pasteDisposable = editor.onKeyDown((e) => {
      if (
        !readOnly &&
        (e.ctrlKey || e.metaKey) &&
        e.keyCode === monaco.KeyCode.KeyV
      ) {
        e.preventDefault();
        navigator.clipboard
          .readText()
          .then((text) => {
            if (text) {
              const selection = editor.getSelection();
              if (selection) {
                editor.executeEdits("paste", [
                  {
                    range: selection,
                    text: text,
                    forceMoveMarkers: true,
                  },
                ]);
              }
            }
          })
          .catch(() => {
            // Fallback: trigger default paste action
            editor.trigger(
              "keyboard",
              "editor.action.clipboardPasteAction",
              {},
            );
          });
      }
    });

    return () => {
      changeDisposable.dispose();
      pasteDisposable.dispose();
      if (formatTimer.current) {
        window.clearTimeout(formatTimer.current);
      }
      editor.dispose();
      model.dispose();
      monacoRef.current = null;
      modelRef.current = null;
      if (editorInstanceRef) {
        editorInstanceRef.current = null;
      }
    };
  }, [readOnly, editorInstanceRef]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    if (model.getLanguageId() !== language) {
      monaco.editor.setModelLanguage(model, language);
    }
  }, [language]);

  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    if (value !== model.getValue()) {
      isExternalUpdate.current = true;
      model.setValue(value);
      isExternalUpdate.current = false;
    }
  }, [value]);

  return (
    <div className={`json-editor-container ${className || ""}`}>
      <div ref={editorRef} className="monaco-wrapper" />
      {placeholder && !value && (
        <div className="editor-placeholder">{placeholder}</div>
      )}
      {showHint && (
        <div className="json-editor-hint">
          <span>{showHint}</span>
        </div>
      )}
    </div>
  );
};
export default MonacoEditor;
