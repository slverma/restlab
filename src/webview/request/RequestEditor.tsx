import React, { useState, useEffect, useRef } from "react";

interface Header {
  key: string;
  value: string;
}

interface RequestConfig {
  id: string;
  name: string;
  folderId: string;
  method: string;
  url: string;
  headers?: Header[];
  body?: string;
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
  });
  const [folderConfig, setFolderConfig] = useState<FolderConfig>({});
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"headers" | "body">("headers");
  const [responseTab, setResponseTab] = useState<"body" | "headers">("body");
  const [isSaved, setIsSaved] = useState(true);

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
        case "responseReceived":
          setResponse(message.response);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSendRequest = () => {
    setIsLoading(true);
    setResponse(null);

    // Combine folder headers with request headers
    const allHeaders = [
      ...(folderConfig.headers || []),
      ...(config.headers || []),
    ];

    // Build full URL
    const fullUrl = folderConfig.baseUrl
      ? `${folderConfig.baseUrl}${config.url}`
      : config.url;

    vscode.postMessage({
      type: "sendRequest",
      method: config.method,
      url: fullUrl,
      headers: allHeaders,
      body: config.body,
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

  return (
    <div className="request-editor">
      <div className="request-header">
        <div className="header-info">
          <h1>{config.name}</h1>
          <span className="subtitle">HTTP Request</span>
        </div>
      </div>

      <div className="request-bar">
        <select
          value={config.method}
          onChange={(e) => {
            handleConfigChange({ method: e.target.value });
            // Switch to headers tab if body tab is active and new method doesn't support body
            if (!methodsWithBody.includes(e.target.value) && activeTab === "body") {
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
          Send
        </button>
        <button
          className={`save-btn ${isSaved ? 'saved' : 'unsaved'}`}
          onClick={handleSaveConfig}
          disabled={isSaved}
          title={isSaved ? 'All changes saved' : 'Save changes'}
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
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>

      {folderConfig.baseUrl && (
        <div className="base-url-hint">
          Base URL: <code>{folderConfig.baseUrl}</code>
        </div>
      )}

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

          {activeTab === "body" && methodsWithBody.includes(config.method) && (
            <div className="body-section">
              <textarea
                value={config.body || ""}
                onChange={(e) => handleConfigChange({ body: e.target.value })}
                placeholder="Request body (JSON, XML, text...)"
                className="body-editor"
              />
            </div>
          )}
        </div>
      </div>

      {(response || isLoading) && (
        <div className="response-section">
          <div className="response-header">
            <h2>Response</h2>
            {response && (
              <div className="response-meta">
                <span
                  className={`status-badge ${getStatusColor(response.status)}`}
                >
                  {response.status} {response.statusText}
                </span>
                <span className="time-badge">{response.time}ms</span>
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
                <div className="tabs">
                  <button
                    className={`tab ${responseTab === "body" ? "active" : ""}`}
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

                <div className="response-content">
                  {responseTab === "body" && (
                    <pre className="response-body">
                      {formatJson(response.data)}
                    </pre>
                  )}
                  {responseTab === "headers" && (
                    <div className="response-headers">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="response-header-row">
                          <span className="header-name">{key}</span>
                          <span className="header-value">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
};
