import * as vscode from "vscode";
import { getNonce } from "../utils/getNonce";

export interface Request {
  id: string;
  name: string;
  folderId: string;
  method: string;
}

export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  parentId?: string;
  requests?: Request[];
  subfolders?: Folder[];
}

export interface FolderConfig {
  baseUrl?: string;
  headers?: { key: string; value: string }[];
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
        case "createRequest":
          const requestName = await vscode.window.showInputBox({
            prompt: "Enter request name",
            placeHolder: "New Request",
          });
          if (requestName) {
            this.addRequest(message.folderId, requestName);
          }
          break;
        case "openRequest":
          vscode.commands.executeCommand(
            "restlab.openRequest",
            message.requestId,
            message.requestName,
            message.folderId
          );
          break;
        case "deleteRequest":
          this.deleteRequest(message.folderId, message.requestId);
          break;
        case "createSubfolder":
          const subfolderName = await vscode.window.showInputBox({
            prompt: "Enter subfolder name",
            placeHolder: "New Subfolder",
          });
          if (subfolderName) {
            this.addSubfolder(message.parentFolderId, subfolderName);
          }
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
      requests: [],
      subfolders: [],
    };
    this._folders.push(newFolder);
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  public addSubfolder(parentFolderId: string, name: string) {
    const newSubfolder: Folder = {
      id: `folder-${Date.now()}`,
      name,
      createdAt: Date.now(),
      parentId: parentFolderId,
      requests: [],
      subfolders: [],
    };

    // Find parent folder recursively and add subfolder
    const addToParent = (folders: Folder[]): boolean => {
      for (const folder of folders) {
        if (folder.id === parentFolderId) {
          if (!folder.subfolders) {
            folder.subfolders = [];
          }
          folder.subfolders.push(newSubfolder);
          return true;
        }
        if (folder.subfolders && addToParent(folder.subfolders)) {
          return true;
        }
      }
      return false;
    };

    addToParent(this._folders);
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  public deleteFolder(folderId: string) {
    // Delete from top-level folders
    const topLevelIndex = this._folders.findIndex((f) => f.id === folderId);
    if (topLevelIndex >= 0) {
      this._folders.splice(topLevelIndex, 1);
    } else {
      // Delete from subfolders recursively
      const deleteFromSubfolders = (folders: Folder[]): boolean => {
        for (const folder of folders) {
          if (folder.subfolders) {
            const index = folder.subfolders.findIndex((f) => f.id === folderId);
            if (index >= 0) {
              folder.subfolders.splice(index, 1);
              return true;
            }
            if (deleteFromSubfolders(folder.subfolders)) {
              return true;
            }
          }
        }
        return false;
      };
      deleteFromSubfolders(this._folders);
    }
    this._saveFolders();
    this._sendFoldersToWebview();
  }

  // Helper to find a folder by ID recursively
  private _findFolder(
    folderId: string,
    folders: Folder[] = this._folders
  ): Folder | undefined {
    for (const folder of folders) {
      if (folder.id === folderId) {
        return folder;
      }
      if (folder.subfolders) {
        const found = this._findFolder(folderId, folder.subfolders);
        if (found) return found;
      }
    }
    return undefined;
  }

  // Get inherited configuration by walking up the parent chain
  // Child config takes priority over parent config
  public getInheritedConfig(folderId: string): FolderConfig {
    const folder = this._findFolder(folderId);
    if (!folder) {
      return {};
    }

    // Get current folder's config
    const currentConfig =
      this._context.globalState.get<FolderConfig>(
        `restlab.folder.${folderId}`
      ) || {};

    // If no parent, return current config
    if (!folder.parentId) {
      return currentConfig;
    }

    // Get parent's inherited config (recursive)
    const parentConfig = this.getInheritedConfig(folder.parentId);

    // Merge configs - child takes priority
    const mergedHeaders = [...(parentConfig.headers || [])];

    // Add child headers, replacing any with same key from parent
    if (currentConfig.headers) {
      for (const childHeader of currentConfig.headers) {
        const existingIndex = mergedHeaders.findIndex(
          (h) => h.key.toLowerCase() === childHeader.key.toLowerCase()
        );
        if (existingIndex >= 0) {
          mergedHeaders[existingIndex] = childHeader;
        } else {
          mergedHeaders.push(childHeader);
        }
      }
    }

    return {
      baseUrl: currentConfig.baseUrl || parentConfig.baseUrl,
      headers: mergedHeaders.length > 0 ? mergedHeaders : undefined,
    };
  }

  // Get the parent folder chain for displaying inherited info
  public getParentChain(folderId: string): Folder[] {
    const chain: Folder[] = [];
    let folder = this._findFolder(folderId);

    while (folder && folder.parentId) {
      const parent = this._findFolder(folder.parentId);
      if (parent) {
        chain.unshift(parent);
        folder = parent;
      } else {
        break;
      }
    }

    return chain;
  }

  public addRequest(folderId: string, name: string) {
    const folder = this._findFolder(folderId);
    if (folder) {
      if (!folder.requests) {
        folder.requests = [];
      }
      const newRequest: Request = {
        id: `request-${Date.now()}`,
        name,
        folderId,
        method: "GET",
      };
      folder.requests.push(newRequest);
      this._saveFolders();
      this._sendFoldersToWebview();
      // Automatically open the new request
      vscode.commands.executeCommand(
        "restlab.openRequest",
        newRequest.id,
        newRequest.name,
        folderId
      );
    }
  }

  public deleteRequest(folderId: string, requestId: string) {
    const folder = this._findFolder(folderId);
    if (folder && folder.requests) {
      folder.requests = folder.requests.filter((r) => r.id !== requestId);
      this._saveFolders();
      this._sendFoldersToWebview();
    }
  }

  public updateRequestMethod(
    folderId: string,
    requestId: string,
    method: string
  ) {
    const folder = this._findFolder(folderId);
    if (folder && folder.requests) {
      const request = folder.requests.find((r) => r.id === requestId);
      if (request) {
        request.method = method;
        this._saveFolders();
        this._sendFoldersToWebview();
      }
    }
  }

  public updateRequestName(folderId: string, requestId: string, name: string) {
    const folder = this._findFolder(folderId);
    if (folder && folder.requests) {
      const request = folder.requests.find((r) => r.id === requestId);
      if (request) {
        request.name = name;
        this._saveFolders();
        this._sendFoldersToWebview();
      }
    }
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
