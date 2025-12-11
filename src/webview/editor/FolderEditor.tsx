import React, { useState, useEffect } from "react";

interface Header {
  key: string;
  value: string;
}

interface FolderConfig {
  id: string;
  name: string;
  description?: string;
  baseUrl?: string;
  headers?: Header[];
}

interface FolderEditorProps {
  folderId: string;
  folderName: string;
}

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

export const FolderEditor: React.FC<FolderEditorProps> = ({
  folderId,
  folderName,
}) => {
  const [config, setConfig] = useState<FolderConfig>({
    id: folderId,
    name: folderName,
    description: "",
    baseUrl: "",
    headers: [],
  });
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    // Request config from extension
    vscode.postMessage({ type: "getConfig" });

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "configLoaded":
          setConfig(message.config);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleChange = (field: keyof FolderConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleAddHeader = () => {
    setConfig((prev) => ({
      ...prev,
      headers: [...(prev.headers || []), { key: "", value: "" }],
    }));
    setIsDirty(true);
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
    setIsDirty(true);
  };

  const handleRemoveHeader = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      headers: (prev.headers || []).filter((_, i) => i !== index),
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    vscode.postMessage({ type: "saveConfig", config });
    setIsDirty(false);
  };

  return (
    <div className="folder-editor">
      <div className="editor-header">
        <div className="header-content">
          <div className="header-icon">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="header-info">
            <h1>{config.name}</h1>
            <span className="subtitle">Collection Configuration</span>
          </div>
        </div>
        <button
          className={`save-btn ${isDirty ? "dirty" : ""}`}
          onClick={handleSave}
          disabled={!isDirty}
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
          Save Changes
        </button>
      </div>

      <div className="editor-content">
        <div className="form-section">
          <h2>General Information</h2>

          <div className="form-group">
            <label htmlFor="name">Collection Name</label>
            <input
              id="name"
              type="text"
              value={config.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Enter collection name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={config.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Describe what this collection is for..."
              rows={3}
            />
          </div>
        </div>

        <div className="form-section">
          <h2>API Configuration</h2>

          <div className="form-group">
            <label htmlFor="baseUrl">Base URL</label>
            <input
              id="baseUrl"
              type="text"
              value={config.baseUrl || ""}
              onChange={(e) => handleChange("baseUrl", e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h2>Default Headers</h2>
            <button className="add-btn" onClick={handleAddHeader}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Header
            </button>
          </div>

          <div className="headers-list">
            {(config.headers || []).length === 0 ? (
              <p className="empty-message">
                No headers configured. Add headers that will be included in all requests.
              </p>
            ) : (
              (config.headers || []).map((header, index) => (
                <div key={index} className="header-row">
                  <input
                    type="text"
                    value={header.key}
                    onChange={(e) =>
                      handleUpdateHeader(index, "key", e.target.value)
                    }
                    placeholder="Header name (e.g., Authorization)"
                    className="header-key"
                  />
                  <input
                    type="text"
                    value={header.value}
                    onChange={(e) =>
                      handleUpdateHeader(index, "value", e.target.value)
                    }
                    placeholder="Header value"
                    className="header-value"
                  />
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveHeader(index)}
                    title="Remove header"
                    aria-label="Remove header"
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
