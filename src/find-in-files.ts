import * as vscode from 'vscode';
import * as path from 'path';
import { subtractString, isBinary, getExcludePatterns, sortSearchResults } from './utils';
import { DEFAULT_DEBOUNCE_TIME } from './constants';
import { QuickPickItem } from 'vscode';

interface SearchState {
  caseSensitive: boolean;
  isSingleLine: boolean;
  showLineNumbers: boolean;
  isRegex: boolean;
  isExclude: boolean;
}
const searchState: SearchState = {
  caseSensitive: false,
  isSingleLine: true,
  showLineNumbers: true,
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

  const toggleViewButton = {
    iconPath: new vscode.ThemeIcon('list-flat'),
    tooltip: 'Switch to Multi-Line View',
  };

  const toggleLineNumbersButton = {
    iconPath: new vscode.ThemeIcon('symbol-numeric'),
    tooltip: 'Show/Hide Line Numbers',
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
  quickPick.buttons = [
    caseSensitiveButton,
    toggleViewButton,
    toggleLineNumbersButton,
    toggleRegexButton,
    toggleExcludeButton,
  ];

  // Initialize timeout for debounce
  let timeout: NodeJS.Timeout | undefined;

  // Get the workspace folder
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';

  // Function to search and show results
  const searchAndShowResults = async (searchString: string) => {
    if (!searchString) {
      quickPick.items = [];
      return;
    }

    // const excludePatterns = ['**/node_modules', '**/.venv', '**/venv', '**/htmlcov', '**/.git'].join(',');
    const excludePatterns2 = await getExcludePatterns(workspaceFolder);

    // Find files to search
    const files = await vscode.workspace.findFiles('**/*', `{${excludePatterns2}}`);

    // Search files and update quick pick items
    const results = await searchFiles(files, searchString, workspaceFolder, searchState);

    // Update quick pick items
    updateQuickPickItems(results, quickPick);
  };

  // Handle search term changes
  quickPick.onDidChangeValue((value) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      searchAndShowResults(value); // Pass the search term
    }, DEFAULT_DEBOUNCE_TIME); // Debounce for 300ms
  });

  // Handle quick pick acceptance
  quickPick.onDidAccept(() => {
    const selected = quickPick.selectedItems[0];
    if (!selected || selected.label === 'No matches found.') {
      return;
    }

    // Extract file path
    const filePath = path.join(workspaceFolder, selected.detail || selected.description?.split(') ')[1] || '');

    // Extract line number
    const lineInfo = selected.description?.match(/\(Line (\d+)\)/);
    const line = lineInfo ? parseInt(lineInfo[1], 10) - 1 : 0;

    // Open the file and set the cursor to the correct line
    vscode.workspace.openTextDocument(filePath).then((doc) => {
      vscode.window.showTextDocument(doc).then((editor) => {
        const range = editor.document.lineAt(line).range;
        editor.selection = new vscode.Selection(range.start, range.end);

        // Center the scroll to the selected line
        const middleLine = Math.floor(editor.visibleRanges[0].end.line / 2);
        const targetLine = Math.max(line - middleLine, 0);
        const targetRange = editor.document.lineAt(targetLine).range;
        editor.revealRange(targetRange, vscode.TextEditorRevealType.InCenter);
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
      case toggleViewButton:
        searchState.isSingleLine = !searchState.isSingleLine;
        updateViewButtonState(toggleViewButton, searchState.isSingleLine);
        break;
      case toggleLineNumbersButton:
        searchState.showLineNumbers = !searchState.showLineNumbers;
        updateButtonState(
          toggleLineNumbersButton,
          searchState.showLineNumbers,
          'symbol-numeric',
          'Line Numbers',
          'Show',
          'Hide',
        );
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

    searchAndShowResults(quickPick.value);
  });

  quickPick.show();
};

let count = 0;

export async function searchFiles(
  files: vscode.Uri[],
  searchString: string,
  workspaceFolder: string,
  searchState: SearchState,
): Promise<QuickPickItem[]> {
  const results: QuickPickItem[] = [];

  for (const file of files) {
    if (isBinary(file.fsPath)) {
      continue;
    }

    // console.log(`${count} ${file.fsPath}`);
    // count++;

    try {
      const document = await vscode.workspace.openTextDocument(file.fsPath);
      const text = document.getText();
      const lines = text.split(/\r?\n/);
      const relativePath = getRelativePath(file.fsPath, workspaceFolder);

      const searchRegex = createSearchRegex(searchString, searchState);

      lines.forEach((line, i) => {
        if (isLineMatch(line, searchString, searchRegex, searchState)) {
          results.push(createQuickPickItem(line, i, relativePath, searchState));
          console.log(relativePath);
        }
      });
    } catch (error) {
      console.warn(`Could not open file as text: ${file.fsPath}`, error);
    }
  }

  return sortSearchResults(results);
}

function getRelativePath(filePath: string, workspaceFolder: string): string {
  let relativePath = subtractString(filePath, workspaceFolder);
  return relativePath.startsWith(path.sep) ? relativePath.slice(1) : relativePath;
}

function createSearchRegex(searchString: string, { isRegex, caseSensitive }: SearchState): RegExp | null {
  if (!isRegex) {
    return null;
  }

  try {
    return new RegExp(searchString, caseSensitive ? 'g' : 'gi');
  } catch (error) {
    console.warn('Invalid regex:', error);
    return null;
  }
}

function isLineMatch(
  line: string,
  searchString: string,
  searchRegex: RegExp | null,
  { caseSensitive }: SearchState,
): boolean {
  if (searchRegex) {
    const match = searchRegex.test(line);
    searchRegex.lastIndex = 0; // Reset lastIndex for subsequent tests
    return match;
  } else {
    const searchInLine = caseSensitive ? line : line.toLowerCase();
    const searchFor = caseSensitive ? searchString : searchString.toLowerCase();
    return searchInLine.includes(searchFor);
  }
}

function createQuickPickItem(
  line: string,
  lineNumber: number,
  relativePath: string,
  { isSingleLine, showLineNumbers }: SearchState,
): QuickPickItem {
  if (isSingleLine) {
    return {
      label: line.trim(),
      description: showLineNumbers ? `(Line ${lineNumber + 1}) ${relativePath}` : relativePath,
    };
  } else {
    return {
      label: line.trim(),
      description: showLineNumbers ? `(Line ${lineNumber + 1})` : '',
      detail: relativePath,
    };
  }
}

function updateQuickPickItems(results: QuickPickItem[], quickPick: vscode.QuickPick<vscode.QuickPickItem>): void {
  if (results.length > 0) {
    quickPick.items = results;
  } else {
    quickPick.items = [{ label: 'No matches found.', description: '' }];
  }
}

// Add these helper functions if they don't exist yet
function updateButtonState(
  button: { iconPath: vscode.ThemeIcon; tooltip: string },
  isActive: boolean,
  iconName: string,
  featureName: string,
  onText: string = 'On',
  offText: string = 'Off',
) {
  button.iconPath = new vscode.ThemeIcon(isActive ? `${iconName}-active` : iconName);
  button.tooltip = `Toggle ${featureName} (${isActive ? onText : offText})`;
}

function updateViewButtonState(button: { iconPath: vscode.ThemeIcon; tooltip: string }, isSingleLine: boolean) {
  if (isSingleLine) {
    button.iconPath = new vscode.ThemeIcon('list-flat');
    button.tooltip = 'Switch to Multi-Line View';
  } else {
    button.iconPath = new vscode.ThemeIcon('list-tree');
    button.tooltip = 'Switch to Single-Line View';
  }
}

export default findInFiles;
