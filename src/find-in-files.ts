import * as vscode from 'vscode';
import * as path from 'path';

import { DEFAULT_DEBOUNCE_TIME } from './constants';
import { SearchState, SearchResult } from './types';
import { searchAndShowResults } from './search';
import { updateButtonState } from './ui';

const searchState: SearchState = {
  caseSensitive: false,
  isRegex: false,
  isExclude: false,
};

const findInFiles = (context: vscode.ExtensionContext) => {
  const quickPick = vscode.window.createQuickPick();
  quickPick.placeholder = 'Type to search in files...';
  quickPick.matchOnDescription = true;
  quickPick.matchOnDetail = true;

  // Get the workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const workspaceFolderPath = workspaceFolder?.uri.fsPath || '';

  // Use workspace state instead of global state
  const workspaceState = context.workspaceState;

  // Retrieve the last search term and results for this workspace
  const lastSearchTerm = workspaceState.get<string>('lastSearchTerm', '');
  const lastSearchResults = workspaceState.get<SearchResult[]>('lastSearchResults', []);
  quickPick.value = lastSearchTerm;
  quickPick.items = lastSearchResults;

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

  // Handle search term changes
  quickPick.onDidChangeValue((value) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      searchAndShowResults(value, quickPick, workspaceFolderPath, searchState);
      // Store the current search term and results for this workspace
      workspaceState.update('lastSearchTerm', value);
      workspaceState.update('lastSearchResults', quickPick.items);
    }, DEFAULT_DEBOUNCE_TIME);
  });

  // Handle quick pick acceptance
  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    if (!selected || selected.label === 'No matches found.') {
      return;
    }

    // Extract file path
    const filePath = path.join(workspaceFolderPath, selected.label).split(':')[0];

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

    searchAndShowResults(quickPick.value, quickPick, workspaceFolderPath, searchState);
    // Update stored results after button click for this workspace
    workspaceState.update('lastSearchResults', quickPick.items);
  });

  // Perform initial search if there's a last search term
  if (lastSearchTerm) {
    quickPick.items = lastSearchResults;
  }

  quickPick.show();
};

export default findInFiles;
