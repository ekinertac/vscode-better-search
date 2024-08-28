import * as vscode from 'vscode';
import * as path from 'path';

const subtractString = (string1: string, string2: string) => {
  return string1.replace(string2, "");
};

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('better-search.findInProject', () => {
    const quickPick = vscode.window.createQuickPick();
    quickPick.placeholder = 'Type to search in files...';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    // Case sensitivity state
    let caseSensitive = false;
    // Toggle state between single-line and multi-line
    let isSingleLine = true;
    // Toggle Line numbers
    let showLineNumbers = true;

    // Add toggle buttons for case sensitivity and single/multi-line mode
    const caseSensitiveButton = {
      iconPath: new vscode.ThemeIcon('case-sensitive'),
      tooltip: 'Toggle Case Sensitivity'
    };

    const toggleViewButton = {
      iconPath: new vscode.ThemeIcon('list-flat'), // Icon indicating single-line view
      tooltip: 'Switch to Multi-Line View'
    };

    const toggleLineNumbersButton = {
      iconPath: new vscode.ThemeIcon('symbol-numeric'),
      tooltip: 'Show/Hide Line Numbers'
    };

    quickPick.buttons = [caseSensitiveButton, toggleViewButton, toggleLineNumbersButton];

    let timeout: NodeJS.Timeout | undefined;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';

    const searchAndShowResults = async (searchString: string) => {
      if (!searchString) {
        quickPick.items = [];
        return;
      }

      const files = await vscode.workspace.findFiles('**/*'); // Find all files

      const results: vscode.QuickPickItem[] = [];

      for (const file of files) {
        const document = await vscode.workspace.openTextDocument(file);
        const text = document.getText();
        const lines = text.split(/\r?\n/);
        let relativePath = subtractString(file.fsPath, workspaceFolder);

        // Remove the leading slash if present
        if (relativePath.startsWith(path.sep)) {
          relativePath = relativePath.slice(1);
        }

        lines.forEach((line, i) => {
          const searchInLine = caseSensitive ? line : line.toLowerCase();
          const searchFor = caseSensitive ? searchString : searchString.toLowerCase();

          if (searchInLine.includes(searchFor)) {
            // Check if we are in single-line or multi-line mode
            if (isSingleLine) {
              results.push({
                label: `${line.trim()}`, // Single-line: only content
                description: showLineNumbers ? `(Line ${i + 1}) ${relativePath}` : relativePath, // File path on the right side
              });
            } else {
              results.push({
                label: `${line.trim()}`, // Multi-line: content on the first line
                description: showLineNumbers ? `(Line ${i + 1})` : '', // Line number in description
                detail: `${relativePath}` // File path in detail (below the line number)
              });
            }
          }
        });
      }

      if (results.length > 0) {
        quickPick.items = results;
      } else {
        quickPick.items = [{ label: 'No matches found.', description: '' }];
      }
    };

    quickPick.onDidChangeValue(value => {
      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => {
        searchAndShowResults(value); // Pass the search string
      }, 300); // Debounce for 300ms
    });

    quickPick.onDidAccept(() => {
      const selected = quickPick.selectedItems[0];
      if (!selected || selected.label === 'No matches found.') {
        return;
      }

      const filePath = path.join(workspaceFolder, selected.detail || selected.description?.split(') ')[1] || ''); // Extract file path
      const lineInfo = selected.description?.match(/\(Line (\d+)\)/);
      const line = lineInfo ? parseInt(lineInfo[1], 10) - 1 : 0;

      vscode.workspace.openTextDocument(filePath).then(doc => {
        vscode.window.showTextDocument(doc).then(editor => {
          const range = editor.document.lineAt(line).range;
          editor.selection = new vscode.Selection(range.start, range.end);
          editor.revealRange(range);
        });
      });
      quickPick.hide();
    });

    // Handle button clicks
    quickPick.onDidTriggerButton(button => {
      if (button === caseSensitiveButton) {
        caseSensitive = !caseSensitive;
        vscode.window.showInformationMessage(`Case sensitivity: ${caseSensitive ? 'On' : 'Off'}`);
        searchAndShowResults(quickPick.value); // Re-trigger search with updated case sensitivity
      } 
      
      if (button === toggleViewButton) {
        isSingleLine = !isSingleLine;

        // Update button icon and tooltip based on the current mode
        if (isSingleLine) {
          toggleViewButton.iconPath = new vscode.ThemeIcon('list-flat'); // Single-line view icon
          toggleViewButton.tooltip = 'Switch to Multi-Line View';
        } else {
          toggleViewButton.iconPath = new vscode.ThemeIcon('list-tree'); // Multi-line view icon
          toggleViewButton.tooltip = 'Switch to Single-Line View';
        }

        searchAndShowResults(quickPick.value); // Re-trigger search with updated display mode
      }

      if(button === toggleLineNumbersButton) {
        showLineNumbers = !showLineNumbers;
        searchAndShowResults(quickPick.value); // Re-trigger search
      }
    });

    quickPick.show();
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
