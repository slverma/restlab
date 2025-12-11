import * as vscode from "vscode";
import axios, { AxiosRequestConfig } from "axios";
import FormData from "form-data";
import { getNonce } from "../utils/getNonce";
import { SidebarProvider } from "./SidebarProvider";

interface RequestConfig {
  id: string;
  name: string;
  folderId: string;
  method: string;
  url: string;
  headers?: { key: string; value: string }[];
  body?: string;
}

export class RequestEditorProvider {
  // Track open panels by request ID
  private static openPanels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static openRequestEditor(
    context: vscode.ExtensionContext,
    requestId: string,
    requestName: string,
    folderId: string,
    sidebarProvider?: SidebarProvider
  ) {
    // Check if panel already exists for this request
    const existingPanel = RequestEditorProvider.openPanels.get(requestId);
    if (existingPanel) {
      existingPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    // Create a new panel
    const panel = vscode.window.createWebviewPanel(
      "restlab.requestEditor",
      `🔗 ${requestName}`,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    // Store the panel reference
    RequestEditorProvider.openPanels.set(requestId, panel);

    // Remove from map when panel is closed
    panel.onDidDispose(() => {
      RequestEditorProvider.openPanels.delete(requestId);
    });

    const provider = new RequestEditorProvider(context);
    panel.webview.html = provider._getHtmlForWebview(
      panel.webview,
      requestId,
      requestName,
      folderId
    );

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "getConfig":
          // Always read fresh config from globalState to get latest folder settings
          const savedRequest = context.globalState.get<RequestConfig>(
            `restlab.request.${requestId}`
          );
          const folderConfig = context.globalState.get<{
            baseUrl?: string;
            headers?: { key: string; value: string }[];
          }>(`restlab.folder.${folderId}`);

          panel.webview.postMessage({
            type: "configLoaded",
            config: savedRequest || {
              id: requestId,
              name: requestName,
              folderId,
              method: "GET",
              url: "",
              headers: [],
              body: "",
            },
            folderConfig: folderConfig || {},
          });
          break;
        case "saveConfig":
          await context.globalState.update(
            `restlab.request.${requestId}`,
            message.config
          );
          // Update method in sidebar if it changed
          if (sidebarProvider && message.config.method) {
            sidebarProvider.updateRequestMethod(
              folderId,
              requestId,
              message.config.method
            );
          }
          break;
        case "sendRequest":
          try {
            const response = await provider._sendHttpRequest(
              message.method,
              message.url,
              message.headers,
              message.body,
              message.formData
            );
            panel.webview.postMessage({
              type: "responseReceived",
              response,
            });
          } catch (error: any) {
            panel.webview.postMessage({
              type: "responseReceived",
              response: {
                status: 0,
                statusText: "Error",
                headers: {},
                data: error.message || "Request failed",
                time: 0,
              },
            });
          }
          break;
      }
    });
  }

  private async _sendHttpRequest(
    method: string,
    url: string,
    headers: { key: string; value: string }[],
    body?: string,
    formData?: {
      key: string;
      value: string;
      type: string;
      fileName?: string;
      fileData?: string;
    }[]
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: string;
    time: number;
  }> {
    const startTime = Date.now();

    try {
      // Build headers object
      const headerObj: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.key && h.value) {
          headerObj[h.key] = h.value;
        }
      });

      let requestData: string | FormData | undefined = body;

      // Handle multipart form data with files
      if (formData && formData.length > 0) {
        const form = new FormData();

        for (const field of formData) {
          if (!field.key.trim()) continue;

          if (field.type === "file" && field.fileData) {
            // File field - convert base64 to buffer
            const fileBuffer = Buffer.from(field.fileData, "base64");
            form.append(field.key, fileBuffer, {
              filename: field.fileName || "file",
              contentType: "application/octet-stream",
            });
          } else {
            // Text field
            form.append(field.key, field.value);
          }
        }

        requestData = form;
        // Merge form headers with existing headers
        Object.assign(headerObj, form.getHeaders());
      }

      const config: AxiosRequestConfig = {
        method: method.toLowerCase() as any,
        url,
        headers: headerObj,
        data: requestData,
        timeout: 30000,
        validateStatus: () => true, // Don't throw on any status code
        transformResponse: [(data) => data], // Keep raw response
      };

      const response = await axios(config);
      const endTime = Date.now();

      // Convert headers to Record<string, string>
      const responseHeaders: Record<string, string> = {};
      Object.entries(response.headers).forEach(([key, value]) => {
        responseHeaders[key] = Array.isArray(value)
          ? value.join(", ")
          : String(value || "");
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: typeof response.data === "string" ? response.data : JSON.stringify(response.data),
        time: endTime - startTime,
      };
    } catch (error: any) {
      throw new Error(error.message || "Request failed");
    }
  }

  private _getHtmlForWebview(
    webview: vscode.Webview,
    requestId: string,
    requestName: string,
    folderId: string
  ): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "dist",
        "request",
        "index.js"
      )
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this.context.extensionUri,
        "dist",
        "request",
        "index.css"
      )
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
        <link href="${styleUri}" rel="stylesheet">
        <title>${requestName}</title>
      </head>
      <body>
        <div id="root" data-request-id="${requestId}" data-request-name="${requestName}" data-folder-id="${folderId}"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
      </body>
      </html>`;
  }
}
