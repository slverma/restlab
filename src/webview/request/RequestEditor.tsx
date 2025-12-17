import React, { useState, useEffect, useRef } from "react";

interface Header {
  key: string;
  value: string;
}

interface FormDataItem {
  key: string;
  value: string;
  type: "text" | "file";
  fileName?: string;
  fileData?: string; // base64 encoded
}

interface RequestConfig {
  id: string;
  name: string;
  folderId: string;
  method: string;
  url: string;
  headers?: Header[];
  body?: string;
  contentType?: string;
  formData?: FormDataItem[];
}

interface FolderConfig {
  baseUrl?: string;
  headers?: Header[];
}

interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: string;
  time: number;
  size: number;
}

interface RequestEditorProps {
  requestId: string;
  requestName: string;
  folderId: string;
}

const HTTP_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const COMMON_HEADERS = [
  "Accept",
  "Accept-Charset",
  "Accept-Encoding",
  "Accept-Language",
  "Authorization",
  "Cache-Control",
  "Content-Type",
  "Content-Length",
  "Cookie",
  "Host",
  "Origin",
  "User-Agent",
  "X-Api-Key",
  "X-Auth-Token",
  "X-Request-ID",
];

const CONTENT_TYPES = [
  { label: "None", value: "" },
  { label: "JSON", value: "application/json" },
  { label: "XML", value: "application/xml" },
  { label: "Form URL Encoded", value: "application/x-www-form-urlencoded" },
  { label: "Form Data", value: "multipart/form-data" },
  { label: "Plain Text", value: "text/plain" },
  { label: "HTML", value: "text/html" },
];

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

const AutocompleteInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suggestions: string[];
  className?: string;
}> = ({ value, onChange, placeholder, suggestions, className }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const filtered = suggestions.filter((s) =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions(suggestions);
    }
    setActiveSuggestionIndex(0);
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filteredSuggestions.length > 0) {
      e.preventDefault();
      onChange(filteredSuggestions[activeSuggestionIndex]);
      setShowSuggestions(false);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="autocomplete-container">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div ref={suggestionsRef} className="autocomplete-dropdown">
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`autocomplete-item ${
                index === activeSuggestionIndex ? "active" : ""
              }`}
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
              onMouseEnter={() => setActiveSuggestionIndex(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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

  // Check if content type is form-based
  const isFormContentType = (ct?: string) =>
    ct === "application/x-www-form-urlencoded" || ct === "multipart/form-data";
  const [folderConfig, setFolderConfig] = useState<FolderConfig>({});
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"headers" | "body">("headers");
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [isSaved, setIsSaved] = useState(true);

  // Layout and resizable panel state
  const [splitLayout, setSplitLayout] = useState<"horizontal" | "vertical">(
    "horizontal"
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
      prev === "horizontal" ? "vertical" : "horizontal"
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
        (h) => h.key.toLowerCase() === "content-type"
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
    value: string
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
    value: string
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

  // Convert form data to body string for sending
  const formDataToBody = (
    formData: FormDataItem[],
    contentType?: string
  ): string => {
    const items = formData.filter((item) => item.key.trim());

    // For URL encoded, only include text fields
    if (contentType === "application/x-www-form-urlencoded") {
      return items
        .filter((item) => item.type !== "file")
        .map(
          (item) =>
            `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`
        )
        .join("&");
    }

    // For multipart/form-data with files, we need to send via extension
    // For now, send text fields as URL encoded
    return items
      .filter((item) => item.type !== "file")
      .map(
        (item) =>
          `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`
      )
      .join("&");
  };

  // Check if form has files
  const hasFileFields = (formData?: FormDataItem[]) =>
    (formData || []).some((item) => item.type === "file" && item.fileData);

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "status-success";
    if (status >= 300 && status < 400) return "status-redirect";
    if (status >= 400 && status < 500) return "status-client-error";
    if (status >= 500) return "status-server-error";
    return "status-error";
  };

  const formatJson = (data: string) => {
    try {
      return JSON.stringify(JSON.parse(data), null, 2);
    } catch {
      return data;
    }
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

  const generateCurlCommand = (): string => {
    // Build full URL
    const fullUrl = folderConfig.baseUrl
      ? `${folderConfig.baseUrl}${config.url}`
      : config.url;

    // Start with curl command
    let curl = `curl -X ${config.method}`;

    // Add URL (escaped)
    curl += ` '${fullUrl.replace(/'/g, "'\\''")}'`;

    // Combine headers
    let allHeaders = [
      ...(folderConfig.headers || []),
      ...(config.headers || []),
    ].filter((h) => h.key && h.value);

    // Add Content-Type if set
    if (config.contentType) {
      const hasContentType = allHeaders.some(
        (h) => h.key.toLowerCase() === "content-type"
      );
      if (!hasContentType) {
        allHeaders = [
          { key: "Content-Type", value: config.contentType },
          ...allHeaders,
        ];
      }
    }

    // Add headers
    allHeaders.forEach((h) => {
      curl += ` \\
  -H '${h.key}: ${h.value.replace(/'/g, "'\\''")}'`;
    });

    // Add body
    const methodsWithBody = ["POST", "PUT", "PATCH"];
    if (methodsWithBody.includes(config.method)) {
      if (isFormContentType(config.contentType) && config.formData?.length) {
        if (config.contentType === "multipart/form-data") {
          // Form data fields
          config.formData.forEach((item) => {
            if (item.type === "file" && item.fileName) {
              curl += ` \\
  -F '${item.key}=@${item.fileName}'`;
            } else if (item.key) {
              curl += ` \\
  -F '${item.key}=${item.value.replace(/'/g, "'\\''")}'`;
            }
          });
        } else {
          // URL encoded
          const body = formDataToBody(config.formData, config.contentType);
          if (body) {
            curl += ` \\
  -d '${body.replace(/'/g, "'\\''")}'`;
          }
        }
      } else if (config.body) {
        curl += ` \\
  -d '${config.body.replace(/'/g, "'\\''")}'`;
      }
    }

    return curl;
  };

  const handleCopyCurl = () => {
    const curl = generateCurlCommand();
    navigator.clipboard.writeText(curl);
    vscode.postMessage({
      type: "showInfo",
      message: "cURL command copied to clipboard!",
    });
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
          {isLoading ? (
            <span className="loading-spinner"></span>
          ) : (
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
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
          <span className="btn-text">Send</span>
        </button>
        <button
          className={`save-btn ${isSaved ? "saved" : "unsaved"}`}
          onClick={handleSaveConfig}
          disabled={isSaved}
          title={isSaved ? "All changes saved" : "Save changes"}
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
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          <span className="btn-text">{isSaved ? "Saved" : "Save"}</span>
        </button>
        <button
          className="curl-btn"
          onClick={handleCopyCurl}
          title="Copy as cURL command"
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
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
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
            {splitLayout === "horizontal" ? (
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
            ) : (
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
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="12" x2="21" y2="12" />
              </svg>
            )}
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
                  [splitLayout === "horizontal"
                    ? "height"
                    : "width"]: `${requestSize}%`,
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
                <div className="headers-section">
                  {folderConfig.headers && folderConfig.headers.length > 0 && (
                    <div className="inherited-headers">
                      <h3>Inherited from Collection</h3>
                      {folderConfig.headers.map((header, index) => (
                        <div key={index} className="header-row inherited">
                          <input
                            type="text"
                            value={header.key}
                            disabled
                            className="header-key"
                          />
                          <input
                            type="text"
                            value={header.value}
                            disabled
                            className="header-value"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="request-headers">
                    <div className="section-header">
                      <h3>Request Headers</h3>
                      <button className="add-btn" onClick={handleAddHeader}>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        Add
                      </button>
                    </div>

                    {(config.headers || []).length === 0 ? (
                      <p className="empty-hint">No custom headers</p>
                    ) : (
                      (config.headers || []).map((header, index) => (
                        <div key={index} className="header-row">
                          <AutocompleteInput
                            value={header.key}
                            onChange={(value) =>
                              handleUpdateHeader(index, "key", value)
                            }
                            placeholder="Header name"
                            suggestions={COMMON_HEADERS}
                            className="header-key"
                          />
                          <input
                            type="text"
                            value={header.value}
                            onChange={(e) =>
                              handleUpdateHeader(index, "value", e.target.value)
                            }
                            placeholder="Value"
                            className="header-value"
                          />
                          <button
                            className="remove-btn"
                            onClick={() => handleRemoveHeader(index)}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                    </div>

                    {isFormContentType(config.contentType) ? (
                      <div className="form-data-section">
                        <div className="section-header">
                          <h3>Form Fields</h3>
                          <button
                            className="add-btn"
                            onClick={handleAddFormData}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Field
                          </button>
                        </div>

                        {(config.formData || []).length === 0 ? (
                          <p className="empty-hint">
                            No form fields. Click "Add Field" to add one.
                          </p>
                        ) : (
                          (config.formData || []).map((item, index) => (
                            <div key={index} className="form-data-row">
                              <input
                                type="text"
                                value={item.key}
                                onChange={(e) =>
                                  handleUpdateFormData(
                                    index,
                                    "key",
                                    e.target.value
                                  )
                                }
                                placeholder="Field name"
                                className="form-data-key"
                              />

                              {config.contentType === "multipart/form-data" && (
                                <button
                                  className={`type-toggle ${
                                    item.type === "file"
                                      ? "file-type"
                                      : "text-type"
                                  }`}
                                  onClick={() =>
                                    handleToggleFormDataType(index)
                                  }
                                  title={
                                    item.type === "file"
                                      ? "Switch to text"
                                      : "Switch to file"
                                  }
                                >
                                  {item.type === "file" ? (
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                      <polyline points="14 2 14 8 20 8" />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <line x1="17" y1="10" x2="3" y2="10" />
                                      <line x1="21" y1="6" x2="3" y2="6" />
                                      <line x1="21" y1="14" x2="3" y2="14" />
                                      <line x1="17" y1="18" x2="3" y2="18" />
                                    </svg>
                                  )}
                                </button>
                              )}

                              {item.type === "file" ? (
                                <div className="file-input-wrapper">
                                  <input
                                    type="file"
                                    id={`file-input-${index}`}
                                    className="file-input-hidden"
                                    onChange={(e) =>
                                      handleFileSelect(
                                        index,
                                        e.target.files?.[0] || null
                                      )
                                    }
                                  />
                                  <label
                                    htmlFor={`file-input-${index}`}
                                    className="file-input-label"
                                  >
                                    <svg
                                      width="14"
                                      height="14"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                    >
                                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                      <polyline points="17 8 12 3 7 8" />
                                      <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    {item.fileName || "Choose file"}
                                  </label>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={item.value}
                                  onChange={(e) =>
                                    handleUpdateFormData(
                                      index,
                                      "value",
                                      e.target.value
                                    )
                                  }
                                  placeholder="Value"
                                  className="form-data-value"
                                />
                              )}

                              <button
                                className="remove-btn"
                                onClick={() => handleRemoveFormData(index)}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          ))
                        )}

                        {hasFileFields(config.formData) && (
                          <p className="file-warning">
                            ⚠️ File uploads require multipart/form-data. Files
                            will be sent as base64 encoded.
                          </p>
                        )}
                      </div>
                    ) : (
                      <textarea
                        value={config.body || ""}
                        onChange={(e) =>
                          handleConfigChange({ body: e.target.value })
                        }
                        placeholder={getBodyPlaceholder(config.contentType)}
                        className="body-editor"
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
                        response.status
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
                          <pre className="response-body">
                            {formatJson(response.data)}
                          </pre>
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
                              )
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
