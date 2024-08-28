import * as fs from "fs";
import path from "path";

export const subtractString = (string1: string, string2: string) => {
  return string1.replace(string2, "");
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

export const getGitignorePatterns = (workspaceFolder: string): string[] => {
  const gitignorePath = path.join(workspaceFolder, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return [""];
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
  const nonEmptyLines = gitignoreContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));

  return nonEmptyLines;
};
