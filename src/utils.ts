import * as fs from 'fs';
import path from 'path';
import { defaultExcludePatterns } from './constants';
import { globifyGitIgnore } from 'globify-gitignore';
import { QuickPickItem } from 'vscode';

export const subtractString = (string1: string, string2: string) => {
  return string1.replace(string2, '');
};

export const isBinary = (filePath: string): boolean => {
  const fileBuffer = fs.readFileSync(filePath);
  for (let i = 0; i < fileBuffer.length; i++) {
    if (fileBuffer[i] === 0) {
      return true; // Null byte found, it's a binary file
    }
  }
  return false; // No null byte found, it's a text file
};

export async function getExcludePatterns(workspaceFolder: string): Promise<string> {
  const gitignoreDirectory = workspaceFolder;
  const gitignorePath = path.join(workspaceFolder, '.gitignore');
  if (!fs.existsSync(gitignorePath)) {
    return defaultExcludePatterns.join(',');
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

  const globifiedEntries = await globifyGitIgnore(gitignoreContent, gitignoreDirectory);
  const patternArray = globifiedEntries
    .map((entry) => entry.glob)
    .filter((pattern) => {
      // Keep only patterns that end with /** or /
      return pattern.endsWith('/**') || pattern.endsWith('/');
    })
    .map((pattern) => {
      // Ensure all patterns end with /**
      return pattern.endsWith('/') ? `${pattern}**` : pattern;
    });

  const filteredPatternArray = patternArray.filter((pattern) => !pattern.includes(','));
  return [...defaultExcludePatterns, ...filteredPatternArray].join(',');
}

export function sortSearchResults(results: QuickPickItem[]): QuickPickItem[] {
  return results.sort((a, b) => {
    const pathA = a.description?.split(') ')[1] || a.detail || '';
    const pathB = b.description?.split(') ')[1] || b.detail || '';

    const pathPartsA = pathA.split(path.sep);
    const pathPartsB = pathB.split(path.sep);

    // Compare path depth
    const depthDiff = pathPartsA.length - pathPartsB.length;
    if (depthDiff !== 0) {
      return depthDiff; // Shorter paths (less depth) first
    }

    // If depths are equal, compare paths lexicographically
    for (let i = 0; i < pathPartsA.length; i++) {
      const comparison = pathPartsA[i].localeCompare(pathPartsB[i]);
      if (comparison !== 0) {
        return comparison;
      }
    }

    // If paths are identical, maintain original order
    return 0;
  });
}

export function printResultFilePaths(results: QuickPickItem[]): void {
  const uniquePaths = new Set<string>();

  results.forEach((item) => {
    const path = item.description?.split(') ')[1] || item.detail || '';
    if (path) {
      uniquePaths.add(path);
    }
  });

  console.log('Files with matches:');
  uniquePaths.forEach((path) => console.log(path));
  console.log(`Total files with matches: ${uniquePaths.size}`);
}
