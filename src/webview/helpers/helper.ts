import { FormDataItem } from "../types/internal.types";

// Check if content type is form-based
export const isFormContentType = (ct?: string) =>
  ct === "application/x-www-form-urlencoded" || ct === "multipart/form-data";

// Convert form data to body string for sending
export const formDataToBody = (
  formData: FormDataItem[],
  contentType?: string,
): string => {
  const items = formData.filter((item) => item.key.trim());

  // For URL encoded, only include text fields
  if (contentType === "application/x-www-form-urlencoded") {
    return items
      .filter((item) => item.type !== "file")
      .map(
        (item) =>
          `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`,
      )
      .join("&");
  }

  // For multipart/form-data with files, we need to send via extension
  // For now, send text fields as URL encoded
  return items
    .filter((item) => item.type !== "file")
    .map(
      (item) =>
        `${encodeURIComponent(item.key)}=${encodeURIComponent(item.value)}`,
    )
    .join("&");
};

// Helper function to strip comments from JSON body before sending
export const stripJsonComments = (jsonString: string): string => {
  if (!jsonString) return jsonString;

  const lines = jsonString.split("\n");
  const nonCommentLines = lines.filter(
    (line) => !line.trimStart().startsWith("//"),
  );
  return nonCommentLines.join("\n");
};

// Check if form has files
export const hasFileFields = (formData?: FormDataItem[]) =>
  (formData || []).some((item) => item.type === "file" && item.fileData);
