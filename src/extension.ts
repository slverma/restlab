import * as vscode from "vscode";
import { SidebarProvider } from "./providers/SidebarProvider";
import { FolderEditorProvider } from "./providers/FolderEditorProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("RESTLab extension is now active!");

  // Initialize the sidebar provider
  const sidebarProvider = new SidebarProvider(context.extensionUri, context);

  // Register the sidebar webview provider
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "restlab-sidebar-view",
      sidebarProvider
    )
  );

  // Register the folder editor provider
  const folderEditorProvider = new FolderEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "restlab.folderEditor",
      folderEditorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    )
  );

  // Register command to create folder
  context.subscriptions.push(
    vscode.commands.registerCommand("restlab.createFolder", async () => {
      const folderName = await vscode.window.showInputBox({
        prompt: "Enter folder name",
        placeHolder: "New Folder",
      });

      if (folderName) {
        sidebarProvider.addFolder(folderName);
      }
    })
  );

  // Register command to open folder configuration
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "restlab.openFolderConfig",
      (folderId: string, folderName: string) => {
        FolderEditorProvider.openFolderEditor(context, folderId, folderName);
      }
    )
  );
}

export function deactivate() {}
