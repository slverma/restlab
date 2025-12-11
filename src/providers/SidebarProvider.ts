import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
}

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _folders: Folder[] = [];

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {
    // Load saved folders from global state
    this._folders = this._context.globalState.get<Folder[]>(
      "restlab.folders",
      []
    );
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case "createFolder":
          const folderName = await vscode.window.showInputBox({
            prompt: "Enter folder name",
            placeHolder: "New Folder",
          });
          if (folderName) {
            this.addFolder(folderName);
          }
          break;
        case "openFolder":
          vscode.commands.executeCommand(
            "restlab.openFolderConfig",
            message.folderId,
            message.folderName
          );
          break;
        case "deleteFolder":
          this.deleteFolder(message.folderId);
          break;
        case "getFolders":
          this._sendFoldersToWebview();
          break;
      }
    });

    // Send initial folders data
    this._sendFoldersToWebview();
  }

  public addFolder(name: string) {
    const newFolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now(),
    };
    this._folders.push(newFolder);
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  public deleteFolder(folderId: string) {
    this._folders = this._folders.filter((f) => f.id !== folderId);
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  private _saveFolders() {
    this._context.globalState.update("restlab.folders", this._folders);
  }

  private _sendFoldersToWebview() {
    if (this._view) {
      this._view.webview.postMessage({
        type: "foldersUpdated",
        folders: this._folders,
      });
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "sidebar", "index.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "dist", "sidebar", "index.css")
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <link href="${styleUri}" rel="stylesheet">
                <title>RESTLab</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
  }
}
