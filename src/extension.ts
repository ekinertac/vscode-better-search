import * as vscode from "vscode";

import findInFiles from "./find-in-files";
import showModal from "./show-modal";

export function activate(context: vscode.ExtensionContext) {
  // Find in Files through vscode palette
  let disposable1 = vscode.commands.registerCommand(
    "better-search.findInProject",
    findInFiles
  );

  // Find in Files through webview modal
  let disposable2 = vscode.commands.registerCommand(
    "better-search.showModal",
    () => showModal(context)
  );

  // Register both commands in the context's subscriptions
  context.subscriptions.push(disposable1, disposable2);
}

export function deactivate() {}
