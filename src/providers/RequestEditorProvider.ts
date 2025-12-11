import * as vscode from "vscode";
import * as https from "https";
import * as http from "http";
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
              message.body
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
    body?: string
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    data: string;
    time: number;
  }> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      try {
        const parsedUrl = new URL(url);
        const isHttps = parsedUrl.protocol === "https:";
        const httpModule = isHttps ? https : http;

        const headerObj: Record<string, string> = {};
        headers.forEach((h) => {
          if (h.key && h.value) {
            headerObj[h.key] = h.value;
          }
        });

        const options: http.RequestOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          method: method,
          headers: headerObj,
        };

        const req = httpModule.request(options, (res) => {
          let data = "";

          res.on("data", (chunk) => {
            data += chunk;
          });

          res.on("end", () => {
            const endTime = Date.now();
            const responseHeaders: Record<string, string> = {};
            Object.entries(res.headers).forEach(([key, value]) => {
              responseHeaders[key] = Array.isArray(value)
                ? value.join(", ")
                : value || "";
            });

            resolve({
              status: res.statusCode || 0,
              statusText: res.statusMessage || "",
              headers: responseHeaders,
              data,
              time: endTime - startTime,
            });
          });
        });

        req.on("error", (error) => {
          reject(error);
        });

        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error("Request timeout"));
        });

        // Send body for methods that support it
        if (body && body.length > 0) {
          // Set Content-Length if not already set
          if (!headerObj["Content-Length"] && !headerObj["content-length"]) {
            req.setHeader("Content-Length", Buffer.byteLength(body));
          }
          req.write(body);
        }

        req.end();
      } catch (error) {
        reject(error);
      }
    });
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
