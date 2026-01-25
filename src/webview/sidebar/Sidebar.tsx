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
      className="inline-flex"
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

// Import Provider type for extensibility
interface ImportProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
}

// RESTLab icon component
const RESTLabIcon: React.FC = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M9 9h6M9 12h6M9 15h4" />
  </svg>
);

const IMPORT_PROVIDERS: ImportProvider[] = [
  {
    id: "restlab",
    name: "RESTLab",
    icon: <RESTLabIcon />,
  },
  {
    id: "postman",
    name: "Postman",
    icon: (
      <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
        <path d="M128 0C57.328 0 0 57.328 0 128s57.328 128 128 128 128-57.328 128-128S198.672 0 128 0zm0 233.6c-58.32 0-105.6-47.28-105.6-105.6S69.68 22.4 128 22.4 233.6 69.68 233.6 128 186.32 233.6 128 233.6z" />
        <path d="M165.5 90.5l-50 50-15-15 50-50 15 15z" />
        <circle cx="100" cy="156" r="12" />
      </svg>
    ),
  },
  {
    id: "thunder-client",
    name: "Thunder Client",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
      </svg>
    ),
  },
];

// Import Dropdown Component
const ImportDropdown: React.FC<{
  onSelect: (providerId: string) => void;
}> = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="header-action-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Import Collection"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M14 1H3L2 2v11l1 1h4v-1H3V2h10v5h1V2l-1-1z" />
          <path d="M11 8l-4 4 1 1 2.5-2.5V16h1v-5.5L14 13l1-1-4-4z" />
        </svg>
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          <div className="dropdown-header">Import from</div>
          {IMPORT_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              className="dropdown-item"
              onClick={() => {
                onSelect(provider.id);
                setIsOpen(false);
              }}
            >
              <span className="flex items-center justify-center w-5 h-5 opacity-80">
                {provider.icon}
              </span>
              <span>{provider.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Export formats for extensibility
const EXPORT_FORMATS = [
  {
    id: "restlab",
    name: "RESTLab",
    icon: <RESTLabIcon />,
  },
  {
    id: "postman",
    name: "Postman",
    icon: (
      <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor">
        <path d="M128 0C57.328 0 0 57.328 0 128s57.328 128 128 128 128-57.328 128-128S198.672 0 128 0zm0 233.6c-58.32 0-105.6-47.28-105.6-105.6S69.68 22.4 128 22.4 233.6 69.68 233.6 128 186.32 233.6 128 233.6z" />
        <path d="M165.5 90.5l-50 50-15-15 50-50 15 15z" />
        <circle cx="100" cy="156" r="12" />
      </svg>
    ),
  },
  {
    id: "thunder-client",
    name: "Thunder Client",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" />
      </svg>
    ),
  },
];

// Export Dropdown Component for folder actions
const ExportDropdown: React.FC<{
  folderId: string;
  onSelect: (folderId: string, format: string) => void;
}> = ({ folderId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-flex" ref={dropdownRef}>
      <Tooltip text="Export Collection">
        <button
          className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-sky-500/10 hover:text-sky-400 hover:shadow-glow"
          onClick={handleClick}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M14 1H3L2 2v11l1 1h4v-1H3V2h10v5h1V2l-1-1z" />
            <path d="M11 16l4-4-1-1-2.5 2.5V8h-1v5.5L8 11l-1 1 4 4z" />
          </svg>
        </button>
      </Tooltip>
      {isOpen && (
        <div className="dropdown-menu min-w-[160px]">
          <div className="dropdown-header">Export as</div>
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              className="dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(folderId, format.id);
                setIsOpen(false);
              }}
            >
              <span className="flex items-center justify-center w-5 h-5 opacity-80">
                {format.icon}
              </span>
              <span>{format.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
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

  const handleImportCollection = (providerId: string) => {
    vscode.postMessage({ type: "importCollection", provider: providerId });
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
    setExpandedFolders((prev) => new Set(prev).add(folderId));
  };

  const handleAddSubfolder = (e: React.MouseEvent, parentFolderId: string) => {
    e.stopPropagation();
    vscode.postMessage({ type: "createSubfolder", parentFolderId });
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
    folderId: string,
  ) => {
    e.stopPropagation();
    vscode.postMessage({ type: "deleteRequest", requestId, folderId });
  };

  const handleExportCollection = (folderId: string, format: string) => {
    vscode.postMessage({ type: "exportCollection", folderId, format });
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
    <div key={folder.id} className="mb-0.5">
      <div
        className="group flex items-center gap-2.5 py-2.5 px-3 mb-1 cursor-pointer rounded-lg transition-all duration-200 border border-transparent hover:bg-glass hover:border-glass relative before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-0 before:bg-restlab-gradient before:rounded-r before:transition-all before:duration-200 hover:before:h-[60%] focus:outline-none focus:border-sky-400 focus:bg-sky-500/10 focus:before:h-[80%]"
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
          className={`flex-shrink-0 transition-transform duration-150 opacity-60 ${
            expandedFolders.has(folder.id) ? "rotate-90" : ""
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
          className="flex-shrink-0 text-vscode transition-colors duration-150 group-hover:text-sky-400 group-hover:drop-shadow-[0_0_4px_rgba(56,189,248,0.4)]"
        >
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium">
          {folder.name}
        </span>
        <div className="flex items-center gap-0.5 ml-auto">
          <Tooltip text="Add Subfolder">
            <button
              className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-indigo-500/10 hover:text-indigo-400 hover:shadow-[0_0_8px_rgba(99,102,241,0.3)]"
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
              className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-sky-500/10 hover:text-sky-400 hover:shadow-glow"
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
              className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-blue-500/10 hover:text-blue-500 hover:shadow-[0_0_8px_rgba(59,130,246,0.3)]"
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
          <ExportDropdown
            folderId={folder.id}
            onSelect={handleExportCollection}
          />
          <Tooltip text="Delete Collection">
            <button
              className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/10 hover:text-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.3)]"
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
        <div className="relative before:content-[''] before:absolute before:left-5 before:top-0 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-white/10 before:to-transparent">
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
          <div className="pl-5" style={{ paddingLeft: `${20 + depth * 16}px` }}>
            {(!folder.requests || folder.requests.length === 0) &&
            (!folder.subfolders || folder.subfolders.length === 0) ? (
              <div className="py-2 px-3 text-xs text-vscode-muted opacity-70 italic">
                <span>No items yet</span>
              </div>
            ) : (
              folder.requests?.map((request) => (
                <div
                  key={request.id}
                  className="group flex items-center gap-2 py-2 px-2.5 mb-0.5 cursor-pointer rounded-md transition-all duration-200 border border-transparent ml-2.5 relative before:content-[''] before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-0 before:bg-restlab-gradient before:rounded-sm before:transition-all before:duration-200 hover:bg-glass hover:border-glass hover:before:h-1/2"
                  onClick={() => handleOpenRequest(request)}
                  role="button"
                  tabIndex={0}
                >
                  <span
                    className={`method-badge ${getMethodColor(request.method)}`}
                  >
                    {request.method}
                  </span>
                  <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-xs">
                    {request.name}
                  </span>
                  <Tooltip text="Delete Request">
                    <button
                      title="Delete Request"
                      className="action-btn w-5 h-5 ml-auto group-hover:opacity-60 hover:!opacity-100 hover:bg-red-500/10 hover:text-red-500 hover:shadow-[0_0_8px_rgba(239,68,68,0.3)]"
                      onClick={(e) =>
                        handleDeleteRequest(e, request.id, folder.id)
                      }
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 border-b border-glass bg-gradient-to-b from-sky-500/5 to-transparent relative after:content-[''] after:absolute after:-bottom-px after:left-4 after:right-4 after:h-px after:bg-restlab-gradient after:opacity-30">
        <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-widest text-gradient mb-4 before:content-[''] before:inline-block before:w-2 before:h-2 before:bg-restlab-gradient before:rounded-sm before:shadow-glow">
          RESTLab
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="btn-primary"
            onClick={handleCreateFolder}
            title="Create Collection"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 6.5V14H2V2h4.5l1 2H14v2.5zm.5-2.5H8l-1-2H1.5l-.5.5v12l.5.5h13l.5-.5V4l-.5-.5z" />
              <path d="M7 7H8V9H10V10H8V12H7V10H5V9H7V7Z" />
            </svg>
            <span>New Collection</span>
          </button>
          <ImportDropdown onSelect={handleImportCollection} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <svg
              className="w-16 h-16 mb-4 opacity-30 text-vscode"
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
            <p className="mb-1 text-vscode font-medium">No collections yet</p>
            <p className="text-xs text-vscode-muted opacity-80">
              Create your first collection to get started
            </p>
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
