import React, { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

type MonacoEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  language: string;
  readOnly?: boolean;
  showHint?: string;
  formatOnChange?: boolean;
  editorInstanceRef?: React.MutableRefObject<Monaco.editor.IStandaloneCodeEditor | null>;
};

const BodyEditor: React.FC<MonacoEditorProps> = ({
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
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
  };

  const handleChange = (newValue: string | undefined) => {
    const val = newValue ?? "";
    onChange?.(val);
  };

  return (
    <div className={`json-editor-container ${className || ""}`}>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme="restlab-dark"
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={{
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
        }}
      />
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

export default BodyEditor;
