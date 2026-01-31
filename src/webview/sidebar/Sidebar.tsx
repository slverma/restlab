import React, { useState, useEffect, useRef } from "react";
import RESTLabIcon from "../components/icons/RestLabIcon";
import PostmanIcon from "../components/icons/PostmanIcon";
import ThunderClientIcon from "../components/icons/ThunderClientIcon";
import { Folder, Request } from "../types/internal.types";
import Tooltip from "../components/Tooltip";
import ChevronIcon from "../components/icons/ChevronIcon";
import FolderIcon from "../components/icons/FolderIcon";
import PlusIcon from "../components/icons/PlusIcon";
import EmptyGlassIcon from "../components/icons/EmptyGlassIcon";
import NoItemsIcon from "../components/icons/NoItemsIcon";
import TrashIcon from "../components/icons/TrashIcon";
import FolderActionsDropdown from "./FolderActionsDropdown";
import ImportDropdown from "./ImportDropdown";

declare function acquireVsCodeApi(): {
  postMessage: (message: unknown) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
};

const vscode = acquireVsCodeApi();

// Import Provider type for extensibility
interface ImportProvider {
  id: string;
  name: string;
  icon: React.ReactNode;
}

const IMPORT_PROVIDERS: ImportProvider[] = [
  {
    id: "restlab",
    name: "RESTLab",
    icon: <RESTLabIcon />,
  },
  {
    id: "postman",
    name: "Postman",
    icon: <PostmanIcon />,
  },
  {
    id: "thunder-client",
    name: "Thunder Client",
    icon: <ThunderClientIcon />,
  },
];
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
        <ChevronIcon
          className={expandedFolders.has(folder.id) ? "rotate-90" : ""}
        />

        <FolderIcon />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-medium">
          {folder.name}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <Tooltip text="Add Request">
            <button
              className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-sky-500/10 hover:text-sky-400 hover:shadow-glow"
              onClick={(e) => handleAddRequest(e, folder.id)}
            >
              <PlusIcon />
            </button>
          </Tooltip>
          <FolderActionsDropdown
            folder={folder}
            onAddSubfolder={handleAddSubfolder}
            onOpenFolder={handleOpenFolder}
            onExport={handleExportCollection}
            onDelete={handleDeleteFolder}
          />
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
                      <TrashIcon />
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
            <EmptyGlassIcon />
            <span>New Collection</span>
          </button>
          <ImportDropdown onSelect={handleImportCollection} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar-thin">
        {folders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <NoItemsIcon />
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
