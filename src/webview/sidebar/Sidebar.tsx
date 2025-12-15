import React, { useState, useEffect, useRef } from "react";

interface Request {
  id: string;
  name: string;
  folderId: string;
  method: string;
}

interface Folder {
  id: string;
  name: string;
  createdAt: number;
  parentId?: string;
  requests?: Request[];
  subfolders?: Folder[];
}

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

// Custom Tooltip Component
const Tooltip: React.FC<{
  text: string;
  children: React.ReactNode;
}> = ({ text, children }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 4,
    });
    setShow(true);
  };

  const handleMouseLeave = () => {
    setShow(false);
  };

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "inline-flex" }}
    >
      {children}
      {show && (
        <div
          className="custom-tooltip"
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    vscode.postMessage({ type: "getFolders" });

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

  const handleToggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleOpenFolder = (e: React.MouseEvent, folder: Folder) => {
    e.stopPropagation();
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

  const handleAddRequest = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "createRequest", folderId });
    // Auto-expand folder
    setExpandedFolders((prev) => new Set(prev).add(folderId));
  };

  const handleAddSubfolder = (e: React.MouseEvent, parentFolderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "createSubfolder", parentFolderId });
    // Auto-expand parent folder
    setExpandedFolders((prev) => new Set(prev).add(parentFolderId));
  };

  const handleOpenRequest = (request: Request) => {
    vscode.postMessage({
      type: "openRequest",
      requestId: request.id,
      requestName: request.name,
      folderId: request.folderId,
    });
  };

  const handleDeleteRequest = (
    e: React.MouseEvent,
    requestId: string,
    folderId: string
  ) => {
    e.stopPropagation();
    vscode.postMessage({ type: "deleteRequest", requestId, folderId });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET":
        return "method-get";
      case "POST":
        return "method-post";
      case "PUT":
        return "method-put";
      case "PATCH":
        return "method-patch";
      case "DELETE":
        return "method-delete";
      default:
        return "";
    }
  };

  // Recursive component for rendering folders
  const FolderItem: React.FC<{ folder: Folder; depth?: number }> = ({
    folder,
    depth = 0,
  }) => (
    <div key={folder.id} className="folder-container">
      <div
        className="folder-item"
        onClick={() => handleToggleFolder(folder.id)}
        role="button"
        tabIndex={0}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className={`chevron ${
            expandedFolders.has(folder.id) ? "expanded" : ""
          }`}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
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
        <div className="folder-actions">
          <Tooltip text="Add Subfolder">
            <button
              className="action-btn add-subfolder-btn"
              onClick={(e) => handleAddSubfolder(e, folder.id)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                <line x1="12" y1="11" x2="12" y2="17" />
                <line x1="9" y1="14" x2="15" y2="14" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip text="Add Request">
            <button
              className="action-btn add-request-btn"
              onClick={(e) => handleAddRequest(e, folder.id)}
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
            </button>
          </Tooltip>
          <Tooltip text="Collection Settings">
            <button
              className="action-btn settings-btn"
              onClick={(e) => handleOpenFolder(e, folder)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip text="Delete Collection">
            <button
              className="action-btn delete-btn"
              onClick={(e) => handleDeleteFolder(e, folder.id)}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </Tooltip>
        </div>
      </div>

      {expandedFolders.has(folder.id) && (
        <div className="folder-contents">
          {/* Render subfolders first */}
          {folder.subfolders &&
            folder.subfolders.map((subfolder) => (
              <FolderItem
                key={subfolder.id}
                folder={subfolder}
                depth={depth + 1}
              />
            ))}

          {/* Render requests */}
          <div
            className="requests-list"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            {(!folder.requests || folder.requests.length === 0) &&
            (!folder.subfolders || folder.subfolders.length === 0) ? (
              <div className="empty-requests">
                <span>No items yet</span>
              </div>
            ) : (
              folder.requests?.map((request) => (
                <div
                  key={request.id}
                  className="request-item"
                  onClick={() => handleOpenRequest(request)}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className={`method-badge ${getMethodColor(request.method)}`}
                  >
                    {request.method}
                  </span>
                  <span className="request-name">{request.name}</span>
                  <Tooltip text="Delete Request">
                    <button
                      className="action-btn delete-btn"
                      onClick={(e) =>
                        handleDeleteRequest(e, request.id, folder.id)
                      }
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </Tooltip>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

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
              <FolderItem key={folder.id} folder={folder} depth={0} />
            ))}
          </>
        )}
      </div>
    </div>
  );
};
