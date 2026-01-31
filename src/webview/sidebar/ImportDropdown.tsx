import React, { useState, useRef, useEffect } from "react";
import { ImportProvider } from "../types/internal.types";
import RESTLabIcon from "../components/icons/RestLabIcon";
import PostmanIcon from "../components/icons/PostmanIcon";
import ThunderClientIcon from "../components/icons/ThunderClientIcon";

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

export default ImportDropdown;
