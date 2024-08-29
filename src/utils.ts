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
  return results
    .sort((a, b) => {
      const pathA = a.description?.split(') ')[1] || a.detail || '';
      const pathB = b.description?.split(') ')[1] || b.detail || '';

      // Compare path length
      const lengthDiff = path.normalize(pathA).split(path.sep).length - path.normalize(pathB).split(path.sep).length;
      if (lengthDiff !== 0) {
        return lengthDiff;
      }

      // If path lengths are equal, sort alphabetically
      return pathA.localeCompare(pathB);
    })
    .reverse();
}
