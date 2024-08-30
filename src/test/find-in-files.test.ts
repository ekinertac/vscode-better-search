import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { searchFiles } from '../search';

suite('Find in Files Test Suite', () => {
  const workspaceFolder = path.join(__dirname, 'test-workspace');

  suiteSetup(() => {
    // Create a test workspace
    if (!fs.existsSync(workspaceFolder)) {
      fs.mkdirSync(workspaceFolder);
    }

    // Create test files
    fs.writeFileSync(path.join(workspaceFolder, 'file1.txt'), 'Hello World\nThis is a test file');
    fs.writeFileSync(path.join(workspaceFolder, 'file2.txt'), 'Another test file\nWith multiple lines');
  });

  suiteTeardown(() => {
    // Clean up test workspace
    fs.rmSync(workspaceFolder, { recursive: true, force: true });
  });

  test('searchFiles finds matches', async () => {
    const files = [
      vscode.Uri.file(path.join(workspaceFolder, 'file1.txt')),
      vscode.Uri.file(path.join(workspaceFolder, 'file2.txt')),
    ];

    const searchState = {
      caseSensitive: false,
      isSingleLine: true,
      showLineNumbers: true,
      isRegex: false,
      isExclude: false,
    };

    const results = await searchFiles(files, 'test', workspaceFolder, searchState);

    assert.strictEqual(results.length, 2);
    assert.strictEqual(results[0].label, 'This is a test file');
    assert.strictEqual(results[1].label, 'Another test file');
  });

  test('searchFiles respects case sensitivity', async () => {
    const files = [
      vscode.Uri.file(path.join(workspaceFolder, 'file1.txt')),
      vscode.Uri.file(path.join(workspaceFolder, 'file2.txt')),
    ];

    const searchState = {
      caseSensitive: true,
      isSingleLine: true,
      showLineNumbers: true,
      isRegex: false,
      isExclude: false,
    };

    const results = await searchFiles(files, 'World', workspaceFolder, searchState);

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].label, 'Hello World');
  });

  test('searchFiles handles regex', async () => {
    const files = [
      vscode.Uri.file(path.join(workspaceFolder, 'file1.txt')),
      vscode.Uri.file(path.join(workspaceFolder, 'file2.txt')),
    ];

    const searchState = {
      caseSensitive: false,
      isSingleLine: true,
      showLineNumbers: true,
      isRegex: true,
      isExclude: false,
    };

    const results = await searchFiles(files, '^\\w+\\s\\w+$', workspaceFolder, searchState);

    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].label, 'Hello World');
  });
});
