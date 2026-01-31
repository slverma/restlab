import AutocompleteInput from "../components/AutocompleteInput";
import { COMMON_HEADERS } from "../config";
import { FolderConfig, RequestConfig } from "../types/internal.types";

type HeaderTabProps = {
  folderConfig: FolderConfig;
  config: RequestConfig;
  handleAddHeader: () => void;
  handleUpdateHeader: (
    index: number,
    field: "key" | "value",
    value: string,
  ) => void;
  handleRemoveHeader: (index: number) => void;
};
const HeaderTab = ({
  folderConfig,
  config,
  handleAddHeader,
  handleUpdateHeader,
  handleRemoveHeader,
}: HeaderTabProps) => (
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
              onChange={(value) => handleUpdateHeader(index, "key", value)}
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
);
export default HeaderTab;
