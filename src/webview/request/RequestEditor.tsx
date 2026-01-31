import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api.js";
import "monaco-editor/esm/vs/language/json/monaco.contribution.js";
import "monaco-editor/esm/vs/language/html/monaco.contribution.js";
import "monaco-editor/esm/vs/language/css/monaco.contribution.js";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution.js";
import {
  FolderConfig,
  FormDataItem,
  RequestConfig,
  RequestEditorProps,
  ResponseData,
} from "../types/internal.types";
import { generateCurlCommand } from "../helpers/curl";
import {
  formDataToBody,
  hasFileFields,
  isFormContentType,
  stripJsonComments,
} from "../helpers/helper";
import FormFieldEditor from "./FormFieldEditor";
import SendIcon from "../components/icons/SendIcon";
import SaveIcon from "../components/icons/SaveIcon";
import CodeIcon from "../components/icons/CodeIcon";
import SplitIcon from "../components/icons/SplitIcon";
import { COMMON_HEADERS, CONTENT_TYPES, HTTP_METHODS } from "../config";
import HeaderTab from "./HeaderTab";

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

const getEditorLanguageFromContentType = (contentType?: string) => {
  if (!contentType) return "plaintext";
  const ct = contentType.toLowerCase();
  if (ct.includes("json")) return "json";
  if (ct.includes("xml")) return "xml";
  if (ct.includes("html")) return "html";
  if (ct.includes("css")) return "css";
  if (ct.includes("javascript") || ct.includes("ecmascript")) {
    return "javascript";
  }
  return "plaintext";
};

const formatJson = (data: string) => {
  try {
    return JSON.stringify(JSON.parse(data), null, 2);
  } catch {
    return data;
  }
};

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

export const RequestEditor: React.FC<RequestEditorProps> = ({
  requestId,
  requestName,
  folderId,
}) => {
  const [config, setConfig] = useState<RequestConfig>({
    id: requestId,
    name: requestName,
    folderId,
    method: "GET",
    url: "",
    headers: [],
    body: "",
    contentType: "",
    formData: [],
  });

  const [folderConfig, setFolderConfig] = useState<FolderConfig>({});
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"headers" | "body">("headers");
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [isSaved, setIsSaved] = useState(true);
  const bodyEditorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(
    null,
  );

  const requestEditorLanguage = useMemo(
    () => getEditorLanguageFromContentType(config.contentType),
    [config.contentType],
  );

  const responseContentType = response?.headers["content-type"];
  const responseEditorLanguage = useMemo(
    () => getEditorLanguageFromContentType(responseContentType),
    [responseContentType],
  );

  const responseBodyValue = useMemo(() => {
    if (!response) return "";
    if (response.status === 0) return response.data;
    if (responseEditorLanguage === "json") {
      return formatJson(response.data);
    }
    return response.data;
  }, [response, responseEditorLanguage]);

  // Layout and resizable panel state
  const [splitLayout, setSplitLayout] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [requestSize, setRequestSize] = useState(50); // percentage for split view
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Handle resizing for both horizontal and vertical layouts
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !splitContainerRef.current) return;

      const containerRect = splitContainerRef.current.getBoundingClientRect();

      if (splitLayout === "horizontal") {
        // Vertical resize (top/bottom)
        const newSize =
          ((e.clientY - containerRect.top) / containerRect.height) * 100;
        const clampedSize = Math.max(20, Math.min(80, newSize));
        setRequestSize(clampedSize);
      } else {
        // Horizontal resize (left/right)
        const newSize =
          ((e.clientX - containerRect.left) / containerRect.width) * 100;
        const clampedSize = Math.max(25, Math.min(75, newSize));
        setRequestSize(clampedSize);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    if (isResizing) {
      document.body.style.cursor =
        splitLayout === "horizontal" ? "row-resize" : "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, splitLayout]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const toggleLayout = () => {
    setSplitLayout((prev) =>
      prev === "horizontal" ? "vertical" : "horizontal",
    );
    setRequestSize(50); // Reset to 50% when switching layouts
  };

  // Methods that support request body
  const methodsWithBody = ["POST", "PUT", "PATCH"];

  useEffect(() => {
    vscode.postMessage({ type: "getConfig" });

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "configLoaded":
          setConfig(message.config);
          setFolderConfig(message.folderConfig || {});
          setIsSaved(true);
          break;
        case "folderConfigUpdated":
          // Update only the folder config without resetting request config
          setFolderConfig(message.folderConfig || {});
          break;
        case "responseReceived":
          setResponse(message.response);
          setIsLoading(false);
          break;
      }
    };

    // Refresh folder config when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        vscode.postMessage({ type: "getConfig" });
      }
    };

    window.addEventListener("message", handleMessage);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleSendRequest = () => {
    setIsLoading(true);
    setResponse(null);

    // Combine folder headers with request headers
    let allHeaders = [
      ...(folderConfig.headers || []),
      ...(config.headers || []),
    ];

    // Add Content-Type header if set and not already present
    if (config.contentType) {
      const hasContentType = allHeaders.some(
        (h) => h.key.toLowerCase() === "content-type",
      );
      if (!hasContentType) {
        allHeaders = [
          { key: "Content-Type", value: config.contentType },
          ...allHeaders,
        ];
      }
    }

    // Build full URL
    const fullUrl = folderConfig.baseUrl
      ? `${folderConfig.baseUrl}${config.url}`
      : config.url;

    // Determine body: use formData if form content type, otherwise use raw body
    let requestBody = config.body;
    let formDataWithFiles: FormDataItem[] | undefined;

    if (isFormContentType(config.contentType)) {
      if (hasFileFields(config.formData)) {
        // Send form data with files to extension for proper multipart handling
        formDataWithFiles = config.formData;
        requestBody = undefined;
      } else {
        requestBody = formDataToBody(config.formData || [], config.contentType);
      }
    } else {
      // Strip comments from JSON/text body before sending
      requestBody = stripJsonComments(config.body || "");
    }

    vscode.postMessage({
      type: "sendRequest",
      method: config.method,
      url: fullUrl,
      headers: allHeaders,
      body: requestBody,
      formData: formDataWithFiles,
    });

    // Auto-save config
    vscode.postMessage({ type: "saveConfig", config });
    setIsSaved(true);
  };

  const handleSaveConfig = () => {
    vscode.postMessage({ type: "saveConfig", config });
    setIsSaved(true);
  };

  const handleConfigChange = (updates: Partial<RequestConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setIsSaved(false);
  };

  const handleAddHeader = () => {
    setConfig((prev) => ({
      ...prev,
      headers: [...(prev.headers || []), { key: "", value: "" }],
    }));
    setIsSaved(false);
  };

  const handleUpdateHeader = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    setConfig((prev) => {
      const newHeaders = [...(prev.headers || [])];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      return { ...prev, headers: newHeaders };
    });
    setIsSaved(false);
  };

  const handleRemoveHeader = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      headers: (prev.headers || []).filter((_, i) => i !== index),
    }));
    setIsSaved(false);
  };

  const handleAddFormData = () => {
    setConfig((prev) => ({
      ...prev,
      formData: [
        ...(prev.formData || []),
        { key: "", value: "", type: "text" },
      ],
    }));
    setIsSaved(false);
  };

  const handleUpdateFormData = (
    index: number,
    field: "key" | "value",
    value: string,
  ) => {
    setConfig((prev) => {
      const newFormData = [...(prev.formData || [])];
      newFormData[index] = { ...newFormData[index], [field]: value };
      return { ...prev, formData: newFormData };
    });
    setIsSaved(false);
  };

  const handleRemoveFormData = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      formData: (prev.formData || []).filter((_, i) => i !== index),
    }));
    setIsSaved(false);
  };

  const handleToggleFormDataType = (index: number) => {
    setConfig((prev) => {
      const newFormData = [...(prev.formData || [])];
      const currentType = newFormData[index].type || "text";
      newFormData[index] = {
        ...newFormData[index],
        type: currentType === "text" ? "file" : "text",
        value: "",
        fileName: undefined,
        fileData: undefined,
      };
      return { ...prev, formData: newFormData };
    });
    setIsSaved(false);
  };

  const handleFileSelect = (index: number, file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setConfig((prev) => {
        const newFormData = [...(prev.formData || [])];
        newFormData[index] = {
          ...newFormData[index],
          fileName: file.name,
          fileData: base64,
          value: file.name,
        };
        return { ...prev, formData: newFormData };
      });
      setIsSaved(false);
    };
    reader.readAsDataURL(file);
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "status-success";
    if (status >= 300 && status < 400) return "status-redirect";
    if (status >= 400 && status < 500) return "status-client-error";
    if (status >= 500) return "status-server-error";
    return "status-error";
  };

  const getFileExtension = (headers: Record<string, string>) => {
    const contentType = headers["content-type"] || "";
    if (contentType.includes("json")) return "json";
    if (contentType.includes("xml")) return "xml";
    if (contentType.includes("html")) return "html";
    if (contentType.includes("css")) return "css";
    if (contentType.includes("javascript")) return "js";
    if (contentType.includes("csv")) return "csv";
    return "txt";
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
    return `${size} ${units[i]}`;
  };

  const getBodyPlaceholder = (contentType?: string) => {
    switch (contentType) {
      case "application/json":
        return '{\n  "key": "value"\n}';
      case "application/xml":
        return '<?xml version="1.0"?>\n<root>\n  <element>value</element>\n</root>';
      case "application/x-www-form-urlencoded":
        return "key1=value1&key2=value2";
      case "text/plain":
        return "Plain text content...";
      case "text/html":
        return "<html>\n  <body>Content</body>\n</html>";
      default:
        return "Request body...";
    }
  };

  const handleCopyCurl = useCallback(() => {
    const curl = generateCurlCommand(folderConfig, config);
    navigator.clipboard.writeText(curl);
    vscode.postMessage({
      type: "showInfo",
      message: "cURL command copied to clipboard!",
    });
  }, [folderConfig, config]);

  const handleBeautifyJson = async () => {
    if (!config.body) return;

    // Try to use Monaco's formatter directly if editor is available
    const bodyEditor = bodyEditorRef.current;
    if (bodyEditor && config.contentType === "application/json") {
      try {
        // First try Monaco's format action
        const formatAction = bodyEditor.getAction(
          "editor.action.formatDocument",
        );
        if (formatAction) {
          await formatAction.run();
          // Check if content actually changed (formatting happened)
          const currentValue = bodyEditor.getValue();
          if (currentValue !== config.body) {
            vscode.postMessage({
              type: "showInfo",
              message: "JSON formatted successfully!",
            });
            return;
          }
        }
      } catch (error) {
        // Fall through to manual formatting
        console.error("Monaco format failed:", error);
      }
    }

    // Fallback to manual formatting
    try {
      const formatted = formatJson(config.body);
      if (formatted !== config.body) {
        handleConfigChange({ body: formatted });
        vscode.postMessage({
          type: "showInfo",
          message: "JSON formatted successfully!",
        });
      } else {
        vscode.postMessage({
          type: "showInfo",
          message: "JSON is already formatted",
        });
      }
    } catch (error) {
      vscode.postMessage({
        type: "showError",
        message: "Failed to format: Invalid JSON",
      });
    }
  };

  return (
    <div className="request-editor" ref={containerRef}>
      <div className="request-header">
        <div className="header-info">
          <input
            type="text"
            value={config.name}
            onChange={(e) => handleConfigChange({ name: e.target.value })}
            className="request-name-input"
            placeholder="Request name"
          />
          <span className="subtitle">HTTP Request</span>
        </div>
      </div>

      <div className="request-bar">
        <select
          value={config.method}
          onChange={(e) => {
            handleConfigChange({ method: e.target.value });
            // Switch to headers tab if body tab is active and new method doesn't support body
            if (
              !methodsWithBody.includes(e.target.value) &&
              activeTab === "body"
            ) {
              setActiveTab("headers");
            }
          }}
          className={`method-select method-${config.method.toLowerCase()}`}
        >
          {HTTP_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={config.url}
          onChange={(e) => handleConfigChange({ url: e.target.value })}
          placeholder={
            folderConfig.baseUrl
              ? "/endpoint"
              : "https://api.example.com/endpoint"
          }
          className="url-input"
        />
        <button
          className="send-btn"
          onClick={handleSendRequest}
          disabled={isLoading}
        >
          {isLoading ? <span className="loading-spinner"></span> : <SendIcon />}
          <span className="btn-text">Send</span>
        </button>
        <button
          className={`save-btn ${isSaved ? "saved" : "unsaved"}`}
          onClick={handleSaveConfig}
          disabled={isSaved}
          title={isSaved ? "All changes saved" : "Save changes"}
        >
          <SaveIcon />
          <span className="btn-text">{isSaved ? "Saved" : "Save"}</span>
        </button>
        <button
          className="curl-btn"
          onClick={handleCopyCurl}
          title="Copy as cURL command"
        >
          <CodeIcon />
          <span className="btn-text">cURL</span>
        </button>
        {(response || isLoading) && (
          <button
            className="layout-toggle-btn"
            onClick={toggleLayout}
            title={
              splitLayout === "horizontal"
                ? "Switch to side-by-side view"
                : "Switch to stacked view"
            }
          >
            <SplitIcon splitLayout={splitLayout} />
          </button>
        )}
      </div>

      {folderConfig.baseUrl && (
        <div className="base-url-hint">
          Base URL: <code>{folderConfig.baseUrl}</code>
        </div>
      )}

      <div
        className={`split-container ${splitLayout} ${
          response || isLoading ? "has-response" : ""
        }`}
        ref={splitContainerRef}
      >
        <div
          className="request-panel"
          style={
            response || isLoading
              ? {
                  [splitLayout === "horizontal" ? "height" : "width"]:
                    `${requestSize}%`,
                }
              : undefined
          }
        >
          <div className="request-content">
            <div className="tabs">
              <button
                className={`tab ${activeTab === "headers" ? "active" : ""}`}
                onClick={() => setActiveTab("headers")}
              >
                Headers
                {(config.headers?.length || 0) > 0 && (
                  <span className="badge">{config.headers?.length}</span>
                )}
              </button>
              {methodsWithBody.includes(config.method) && (
                <button
                  className={`tab ${activeTab === "body" ? "active" : ""}`}
                  onClick={() => setActiveTab("body")}
                >
                  Body
                </button>
              )}
            </div>

            <div className="tab-content">
              {activeTab === "headers" && (
                <HeaderTab
                  folderConfig={folderConfig}
                  config={config}
                  handleAddHeader={handleAddHeader}
                  handleUpdateHeader={handleUpdateHeader}
                  handleRemoveHeader={handleRemoveHeader}
                />
              )}

              {activeTab === "body" &&
                methodsWithBody.includes(config.method) && (
                  <div className="body-section">
                    <div className="content-type-selector">
                      <label>Content Type:</label>
                      <select
                        value={config.contentType || ""}
                        onChange={(e) =>
                          handleConfigChange({ contentType: e.target.value })
                        }
                        className="content-type-select"
                      >
                        {CONTENT_TYPES.map((ct) => (
                          <option key={ct.value} value={ct.value}>
                            {ct.label}
                            {ct.value ? ` (${ct.value})` : ""}
                          </option>
                        ))}
                      </select>
                      <button
                        className="beautify-btn"
                        onClick={handleBeautifyJson}
                        disabled={
                          !config.body ||
                          config.contentType !== "application/json"
                        }
                        title="Format JSON (Beautify)"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="4 7 4 4 20 4 20 7" />
                          <line x1="9" y1="20" x2="15" y2="20" />
                          <line x1="12" y1="4" x2="12" y2="20" />
                        </svg>
                        <span className="btn-text">Beautify</span>
                      </button>
                    </div>

                    {isFormContentType(config.contentType) ? (
                      <FormFieldEditor
                        handleAddFormData={handleAddFormData}
                        config={config}
                        handleUpdateFormData={handleUpdateFormData}
                        handleToggleFormDataType={handleToggleFormDataType}
                        handleFileSelect={handleFileSelect}
                        handleRemoveFormData={handleRemoveFormData}
                      />
                    ) : (
                      <MonacoEditor
                        value={config.body || ""}
                        onChange={(value) =>
                          handleConfigChange({ body: value })
                        }
                        placeholder={getBodyPlaceholder(config.contentType)}
                        className="body-editor"
                        language={requestEditorLanguage}
                        formatOnChange={
                          config.contentType === "application/json"
                        }
                        showHint="Ctrl+F search • Ctrl+/ comment • Alt+Shift+F format"
                        editorInstanceRef={bodyEditorRef}
                      />
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {(response || isLoading) && (
          <div
            className={`resize-handle ${splitLayout} ${
              isResizing ? "active" : ""
            }`}
            onMouseDown={handleResizeStart}
          >
            <div className="resize-handle-bar" />
          </div>
        )}

        {(response || isLoading) && (
          <div
            className="response-panel"
            style={{
              [splitLayout === "horizontal" ? "height" : "width"]: `${
                100 - requestSize
              }%`,
            }}
          >
            <div className="response-section">
              <div className="response-header">
                <h2>Response</h2>
                {response && (
                  <div className="response-meta">
                    <span
                      className={`status-badge ${getStatusColor(
                        response.status,
                      )}`}
                    >
                      {response.status === 0
                        ? "Network Error"
                        : `${response.status} ${response.statusText}`}
                    </span>
                    {response.status !== 0 && (
                      <>
                        <span className="time-badge">{response.time}ms</span>
                        <span className="size-badge">
                          {formatSize(response.size)}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {isLoading ? (
                <div className="loading-state">
                  <span className="loading-spinner large"></span>
                  <p>Sending request...</p>
                </div>
              ) : (
                response && (
                  <>
                    <div className="response-toolbar">
                      <div className="tabs">
                        <button
                          className={`tab ${
                            responseTab === "body" ? "active" : ""
                          }`}
                          onClick={() => setResponseTab("body")}
                        >
                          Body
                        </button>
                        <button
                          className={`tab ${
                            responseTab === "headers" ? "active" : ""
                          }`}
                          onClick={() => setResponseTab("headers")}
                        >
                          Headers
                          <span className="badge">
                            {Object.keys(response.headers).length}
                          </span>
                        </button>
                      </div>
                      <div className="response-actions">
                        <button
                          className="action-btn"
                          title="Copy to clipboard"
                          onClick={() => {
                            const content =
                              responseTab === "body"
                                ? formatJson(response.data)
                                : Object.entries(response.headers)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join("\n");
                            navigator.clipboard.writeText(content);
                            vscode.postMessage({
                              type: "showInfo",
                              message: "Copied to clipboard!",
                            });
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                            ></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                          Copy
                        </button>
                        <button
                          className="action-btn"
                          title="Download response"
                          onClick={() => {
                            const content =
                              responseTab === "body"
                                ? formatJson(response.data)
                                : Object.entries(response.headers)
                                    .map(([k, v]) => `${k}: ${v}`)
                                    .join("\n");
                            const extension =
                              responseTab === "body"
                                ? getFileExtension(response.headers)
                                : "txt";
                            const filename = `response-${Date.now()}.${extension}`;
                            vscode.postMessage({
                              type: "downloadResponse",
                              content,
                              filename,
                              mimeType:
                                responseTab === "body"
                                  ? response.headers["content-type"] ||
                                    "text/plain"
                                  : "text/plain",
                            });
                          }}
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          Download
                        </button>
                      </div>
                    </div>

                    <div className="response-content">
                      {responseTab === "body" &&
                        (response.status === 0 ? (
                          <div className="error-display">
                            <div className="error-icon">
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                              </svg>
                            </div>
                            <h3 className="error-title">Request Failed</h3>
                            <p className="error-message">{response.data}</p>
                          </div>
                        ) : (
                          <MonacoEditor
                            value={responseBodyValue}
                            language={responseEditorLanguage}
                            readOnly
                            className="response-editor"
                            showHint="Ctrl+F search"
                          />
                        ))}
                      {responseTab === "headers" && (
                        <div className="response-headers">
                          {Object.entries(response.headers).length === 0 ? (
                            <p className="empty-hint">No headers available</p>
                          ) : (
                            Object.entries(response.headers).map(
                              ([key, value]) => (
                                <div key={key} className="response-header-row">
                                  <span className="header-name">{key}</span>
                                  <span className="header-value">{value}</span>
                                </div>
                              ),
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
