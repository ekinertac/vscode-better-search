import * as vscode from 'vscode';

// Toggle button definitions
export const caseSensitiveButton = {
  iconPath: new vscode.ThemeIcon('case-sensitive'),
  tooltip: 'Toggle Case Sensitivity',
};

export const toggleRegexButton = {
  iconPath: new vscode.ThemeIcon('regex'),
  tooltip: 'Toggle Regex Search',
};

export const toggleExcludeButton = {
  iconPath: new vscode.ThemeIcon('exclude'),
  tooltip: 'Toggle Exclude Patterns',
};

export function createQuickPickItem(line: string, lineNumber: number, relativePath: string): vscode.QuickPickItem {
  return {
    label: `${relativePath}:${lineNumber + 1}`,
    detail: line.trim(),
  };
}

export function updateQuickPickItems(
  results: vscode.QuickPickItem[],
  quickPick: vscode.QuickPick<vscode.QuickPickItem>,
): void {
  if (results.length > 0) {
    quickPick.items = [...results]; // Create a new array to trigger update
  } else {
    quickPick.items = [{ label: 'No matches found.', description: '' }];
  }
}

// Add these helper functions if they don't exist yet
export function updateButtonState(
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
