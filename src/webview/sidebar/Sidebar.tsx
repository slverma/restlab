import React, { useState, useEffect } from "react";

interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

export const Sidebar: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    // Request initial folders
    vscode.postMessage({ type: "getFolders" });

    // Listen for messages from extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case "foldersUpdated":
          setFolders(message.folders);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleCreateFolder = () => {
    vscode.postMessage({ type: "createFolder" });
  };

  const handleOpenFolder = (folder: Folder) => {
    vscode.postMessage({
      type: "openFolder",
      folderId: folder.id,
      folderName: folder.name,
    });
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "deleteFolder", folderId });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>RESTLab</h2>
        <button
          className="create-folder-btn"
          onClick={handleCreateFolder}
          title="Create Collection"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 6.5V14H2V2h4.5l1 2H14v2.5zm.5-2.5H8l-1-2H1.5l-.5.5v12l.5.5h13l.5-.5V4l-.5-.5z" />
            <path d="M7 7H8V9H10V10H8V12H7V10H5V9H7V7Z" />
          </svg>
          <span>New Collection</span>
        </button>
      </div>

      <div className="folder-list">
        {folders.length === 0 ? (
          <div className="empty-state">
            <svg
              className="empty-state-icon"
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <p>No collections yet</p>
            <p className="hint">Create your first collection to get started</p>
          </div>
        ) : (
          <>
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="folder-item"
                onClick={() => handleOpenFolder(folder)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    handleOpenFolder(folder);
                  }
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="folder-icon"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className="folder-name">{folder.name}</span>
                <button
                  className="delete-btn"
                  onClick={(e) => handleDeleteFolder(e, folder.id)}
                  title="Delete Collection"
                  aria-label={`Delete ${folder.name}`}
                >
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
