import React, { useState, useEffect, useRef } from "react";
import { Folder } from "../types/internal.types";
import Tooltip from "../components/Tooltip";
import ThunderClientIcon from "../components/icons/ThunderClientIcon";
import PostmanIcon from "../components/icons/PostmanIcon";
import RESTLabIcon from "../components/icons/RestLabIcon";
import TrashIcon from "../components/icons/TrashIcon";

// Export formats for extensibility
export const EXPORT_FORMATS = [
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

// Folder Actions Dropdown Component
const FolderActionsDropdown: React.FC<{
  folder: Folder;
  onAddSubfolder: (e: React.MouseEvent, folderId: string) => void;
  onOpenFolder: (e: React.MouseEvent, folder: Folder) => void;
  onExport: (folderId: string, format: string) => void;
  onDelete: (e: React.MouseEvent, folderId: string) => void;
}> = ({ folder, onAddSubfolder, onOpenFolder, onExport, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setShowExport(false);
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
      <Tooltip text="More Actions">
        <button
          className="action-btn group-hover:opacity-60 hover:!opacity-100 hover:bg-slate-500/10 hover:text-slate-400"
          onClick={handleClick}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        </button>
      </Tooltip>
      {isOpen && !showExport && (
        <div className="dropdown-menu min-w-[180px]">
          <button
            className="dropdown-item"
            onClick={(e) => {
              onAddSubfolder(e, folder.id);
              setIsOpen(false);
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>Add Subfolder</span>
          </button>
          <button
            className="dropdown-item"
            onClick={(e) => {
              onOpenFolder(e, folder);
              setIsOpen(false);
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Collection Settings</span>
          </button>
          <button
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowExport(true);
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M14 1H3L2 2v11l1 1h4v-1H3V2h10v5h1V2l-1-1z" />
              <path d="M11 16l4-4-1-1-2.5 2.5V8h-1v5.5L8 11l-1 1 4 4z" />
            </svg>
            <span>Export Collection</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-auto opacity-60"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
          <div className="dropdown-divider" />
          <button
            className="dropdown-item text-red-500"
            onClick={(e) => {
              onDelete(e, folder.id);
              setIsOpen(false);
            }}
          >
            <TrashIcon />
            <span>Delete Collection</span>
          </button>
        </div>
      )}
      {isOpen && showExport && (
        <div className="dropdown-menu min-w-[180px]">
          <button
            className="dropdown-item"
            onClick={(e) => {
              e.stopPropagation();
              setShowExport(false);
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="opacity-60"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
            <span>Back</span>
          </button>
          <div className="dropdown-divider" />
          <div className="dropdown-header">Export as</div>
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              className="dropdown-item"
              onClick={(e) => {
                e.stopPropagation();
                onExport(folder.id, format.id);
                setIsOpen(false);
                setShowExport(false);
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

export default FolderActionsDropdown;
