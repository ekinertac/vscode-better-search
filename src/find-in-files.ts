import * as vscode from 'vscode';
import * as path from 'path';

import { DEFAULT_DEBOUNCE_TIME } from './constants';
import { SearchState } from './types';
import { searchAndShowResults } from './search';
import { updateButtonState } from './ui';

const searchState: SearchState = {
  caseSensitive: false,
  isRegex: false,
  isExclude: false,
};

const findInFiles = () => {
  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder = 'Type to search in files...';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // Toggle button definitions
  const caseSensitiveButton = {
    iconPath: new vscode.ThemeIcon('case-sensitive'),
    tooltip: 'Toggle Case Sensitivity',
  };

  const toggleRegexButton = {
    iconPath: new vscode.ThemeIcon('regex'),
    tooltip: 'Toggle Regex Search',
  };

  const toggleExcludeButton = {
    iconPath: new vscode.ThemeIcon('exclude'),
    tooltip: 'Toggle Exclude Patterns',
  };

  // Add toggle buttons to the quick pick
  quickPick.buttons = [caseSensitiveButton, toggleRegexButton, toggleExcludeButton];

  // Initialize timeout for debounce
  let timeout: NodeJS.Timeout | undefined;

  // Get the workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';

  // Handle search term changes
  quickPick.onDidChangeValue((value) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      searchAndShowResults(value, quickPick, workspaceFolder, searchState); // Pass the search term
    }, DEFAULT_DEBOUNCE_TIME); // Debounce for 300ms
  });

  // Handle quick pick acceptance
  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    if (!selected || selected.label === 'No matches found.') {
      return;
    }

    // Extract file path
    const filePath = path.join(workspaceFolder, selected.label).split(':')[0];

    // Extract line number
    const lineInfo = selected.label.split(':')[1];
    const line = parseInt(lineInfo, 10) - 1;

    // Open the file in a new tab and set the cursor to the correct line
    vscode.workspace.openTextDocument(filePath).then((doc) => {
      vscode.window.showTextDocument(doc, { preview: false }).then((editor) => {
        const range = editor.document.lineAt(line).range;
        editor.selection = new vscode.Selection(range.start, range.end);

        // Center the scroll to the selected line
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      });
    });

    // Hide the quick pick after opening the file
    quickPick.hide();
  });

  // Handle button clicks
  quickPick.onDidTriggerButton((button) => {
    switch (button) {
      case caseSensitiveButton:
        searchState.caseSensitive = !searchState.caseSensitive;
        updateButtonState(caseSensitiveButton, searchState.caseSensitive, 'case-sensitive', 'Case Sensitivity');
        break;
      case toggleRegexButton:
        searchState.isRegex = !searchState.isRegex;
        updateButtonState(toggleRegexButton, searchState.isRegex, 'regex', 'Regex Search');
        break;
      case toggleExcludeButton:
        searchState.isExclude = !searchState.isExclude;
        updateButtonState(toggleExcludeButton, searchState.isExclude, 'exclude', 'Exclude Patterns');
        break;
    }

    searchAndShowResults(quickPick.value, quickPick, workspaceFolder, searchState);
  });

  quickPick.show();
};

export default findInFiles;
