import * as vscode from 'vscode';
import * as fs from 'fs';
import { QuickPickItem } from 'vscode';
import { SearchState } from './types';
import { getExcludePatterns, getRelativePath, isBinary } from './utils';
import { createQuickPickItem, updateQuickPickItems } from './ui';

// Function to search and show results
export const searchAndShowResults = async (
  searchString: string,
  quickPick: vscode.QuickPick<vscode.QuickPickItem>,
  workspaceFolder: string,
  searchState: SearchState,
) => {
  if (!searchString) {
    quickPick.items = [];
    return;
  }

  // performance measurements
  const startTime = performance.now();

  const excludePatterns2 = await getExcludePatterns(workspaceFolder);
  let files = await vscode.workspace.findFiles('**/*', `{${excludePatterns2}}`);

  // Create a generator function to search files
  const resultsGenerator = searchFilesGenerator(files, searchString, workspaceFolder, searchState);

  // Use the generator to update results incrementally
  for await (const result of resultsGenerator) {
    updateQuickPickItems(result, quickPick);
  }

  const endTime = performance.now();
  console.log(`Search completed in ${endTime - startTime} milliseconds`);
};

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

    try {
      const document = await vscode.workspace.openTextDocument(file.fsPath);
      const text = document.getText();
      const lines = text.split(/\r?\n/);
      const relativePath = getRelativePath(file.fsPath, workspaceFolder);

      const searchRegex = createSearchRegex(searchString, searchState);

      lines.forEach((line, i) => {
        if (isLineMatch(line, searchString, searchRegex, searchState)) {
          results.push(createQuickPickItem(line, i, relativePath));
        }
      });
    } catch (error) {
      console.warn(`Could not open file as text: ${file.fsPath}`, error);
    }
  }

  return results;
}

export async function* searchFilesGenerator(
  files: vscode.Uri[],
  searchString: string,
  workspaceFolder: string,
  searchState: SearchState,
): AsyncGenerator<QuickPickItem[], void, unknown> {
  const results: QuickPickItem[] = [];

  for (const file of files) {
    if (isBinary(file.fsPath)) {
      continue;
    }

    try {
      const text = await fs.promises.readFile(file.fsPath, 'utf8');
      const lines = text.split(/\r?\n/);
      const relativePath = getRelativePath(file.fsPath, workspaceFolder);

      const searchRegex = createSearchRegex(searchString, searchState);

      let fileHasMatches = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isLineMatch(line, searchString, searchRegex, searchState)) {
          const newItem = createQuickPickItem(line, i, relativePath);
          results.push(newItem);
          fileHasMatches = true;
        }
      }

      if (fileHasMatches) {
        yield [...results]; // Sort and yield only when a file has matches
      }
    } catch (error) {
      console.warn(`Could not read file: ${file.fsPath}`, error);
    }
  }
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
