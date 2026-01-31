import { hasFileFields } from "../helpers/helper";
import { useRequestContext } from "./RequestContext";

const FormFieldEditor = () => {
  const {
    config,
    handleAddFormData,
    handleUpdateFormData,
    handleToggleFormDataType,
    handleFileSelect,
    handleRemoveFormData,
  } = useRequestContext();

  return (
    <div className="form-data-section">
      <div className="section-header">
        <h3>Form Fields</h3>
        <button className="add-btn" onClick={handleAddFormData}>
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
                handleUpdateFormData(index, "key", e.target.value)
              }
              placeholder="Field name"
              className="form-data-key"
            />

            {config.contentType === "multipart/form-data" && (
              <button
                className={`type-toggle ${
                  item.type === "file" ? "file-type" : "text-type"
                }`}
                onClick={() => handleToggleFormDataType(index)}
                title={
                  item.type === "file" ? "Switch to text" : "Switch to file"
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
                    handleFileSelect(index, e.target.files?.[0] || null)
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
                  handleUpdateFormData(index, "value", e.target.value)
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
          ⚠️ File uploads require multipart/form-data. Files will be sent as
          base64 encoded.
        </p>
      )}
    </div>
  );
};

export default FormFieldEditor;
