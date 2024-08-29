import * as vscode from 'vscode';

import findInFiles from './find-in-files';

export function activate(context: vscode.ExtensionContext) {
  // Find in Files through vscode palette
  let findInProjectCommand = vscode.commands.registerCommand('better-search.findInProject', findInFiles);

  // Register both commands in the context's subscriptions
  context.subscriptions.push(findInProjectCommand);
}

export function deactivate() {}
