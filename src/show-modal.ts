import * as vscode from "vscode";

const showModal = (context: vscode.ExtensionContext) => {
  // Create and show a webview for the modal
  const panel = vscode.window.createWebviewPanel(
    "betterSearchModal", // Internal identifier for the modal
    "Better Search Modal", // Title of the modal
    vscode.ViewColumn.One, // Where to show the modal (in the editor)
    {
      enableScripts: true, // Allow JavaScript in the webview
      retainContextWhenHidden: true, // Retain content when hidden
    }
  );

  // Set the HTML content for the webview
  panel.webview.html = getModalHtmlContent();

  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    (message) => {
      switch (message.command) {
        case "close":
          panel.dispose(); // Close the modal
          break;
      }
    },
    undefined,
    context.subscriptions
  );
};

// Function to return HTML content for the modal webview
function getModalHtmlContent() {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Better Search Modal</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        padding: 20px;
      }
      h1 {
        color: #007acc;
      }
      button {
        margin-top: 20px;
        padding: 10px 20px;
        font-size: 16px;
      }
    </style>
  </head>
  <body>
    <h1>Better Search Modal</h1>
    <p>This is a custom modal created using a webview in VS Code.</p>
    <button onclick="sendMessage()">Close Modal</button>
    <script>
      const vscode = acquireVsCodeApi();
      function sendMessage() {
        vscode.postMessage({ command: 'close' });
      }
    </script>
  </body>
  </html>
  `;
}

export default showModal;
