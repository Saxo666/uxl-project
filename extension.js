const fs = require("fs");
const path = require("path");
const vscode = require("vscode");

function activate(context) {
  const previewPanels = new Map();

  const previewCommand = vscode.commands.registerCommand("uxl.preview", async () => {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId !== "uxl") {
      vscode.window.showErrorMessage("Open a .uxl file before running UXL Preview.");
      return;
    }

    const document = editor.document;
    const panelKey = document.uri.toString();
    let panel = previewPanels.get(panelKey);

    if (panel) {
      panel.reveal(vscode.ViewColumn.Beside);
      updatePreviewPanel(panel, context.extensionPath, document.getText(), document.fileName);
      return;
    }

    panel = vscode.window.createWebviewPanel(
      "uxlPreview",
      `UXL Preview: ${path.basename(document.fileName)}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
      }
    );

    previewPanels.set(panelKey, panel);
    updatePreviewPanel(panel, context.extensionPath, document.getText(), document.fileName);

    const changeSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.toString() === panelKey) {
        updatePreviewPanel(panel, context.extensionPath, event.document.getText(), event.document.fileName);
      }
    });

    panel.onDidDispose(() => {
      previewPanels.delete(panelKey);
      changeSubscription.dispose();
    });
  });

  context.subscriptions.push(previewCommand);
}

function deactivate() {}

function updatePreviewPanel(panel, extensionPath, code, fileName) {
  panel.title = `UXL Preview: ${path.basename(fileName)}`;
  panel.webview.html = getPreviewHtml(extensionPath, code, fileName);
}

function getPreviewHtml(extensionPath, code, fileName) {
  const parserSource = fs.readFileSync(path.join(extensionPath, "parser.js"), "utf8");
  const interpreterSource = fs.readFileSync(path.join(extensionPath, "interpreter.js"), "utf8");
  const safeCode = JSON.stringify(code);
  const safeFileName = JSON.stringify(path.basename(fileName));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>UXL Preview</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #0f172a;
      --panel: #111827;
      --border: rgba(148, 163, 184, 0.25);
      --muted: #94a3b8;
      --text: #e5eefc;
      --accent: #f59e0b;
      --error-bg: #2b1111;
      --error-border: #ef4444;
      --surface: rgba(15, 23, 42, 0.72);
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(245, 158, 11, 0.14), transparent 32%),
        radial-gradient(circle at top right, rgba(56, 189, 248, 0.14), transparent 28%),
        var(--bg);
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
    }

    .shell {
      max-width: 960px;
      margin: 0 auto;
      display: grid;
      gap: 18px;
    }

    .hero {
      padding: 18px 20px;
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--surface);
      backdrop-filter: blur(12px);
    }

    .eyebrow {
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 12px;
      margin-bottom: 8px;
    }

    h1 {
      margin: 0;
      font-size: 28px;
    }

    .subtitle {
      margin-top: 8px;
      color: var(--muted);
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 18px;
      background: var(--surface);
      padding: 20px;
      backdrop-filter: blur(12px);
    }

    .card-title {
      margin: 0 0 16px;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted);
    }

    #app p {
      margin: 0 0 12px;
      line-height: 1.55;
    }

    #app input {
      display: block;
      width: 100%;
      max-width: 340px;
      margin-bottom: 12px;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      padding: 12px 14px;
      background: rgba(15, 23, 42, 0.85);
      color: var(--text);
    }

    #app button {
      margin-right: 10px;
      margin-bottom: 10px;
      border: none;
      border-radius: 999px;
      padding: 11px 16px;
      background: linear-gradient(135deg, #f59e0b, #fb7185);
      color: white;
      cursor: pointer;
      font-weight: 600;
    }

    pre.error {
      margin: 0;
      padding: 14px;
      border-radius: 12px;
      border: 1px solid var(--error-border);
      background: var(--error-bg);
      color: #fecaca;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <div class="shell">
    <section class="hero">
      <div class="eyebrow">UXL Preview</div>
      <h1 id="filename"></h1>
      <div class="subtitle">Live preview from the current VS Code editor.</div>
    </section>

    <section class="card">
      <h2 class="card-title">Rendered Output</h2>
      <div id="app"></div>
    </section>
  </div>

  <script>
    ${parserSource}
  </script>
  <script>
    ${interpreterSource}
  </script>
  <script>
    const runtime = UXLInterpreter.createRuntime({
      renderCurrentProgram: renderCurrentProgram,
    });
    let currentProgram = [];
    let currentCode = ${safeCode};

    document.getElementById("filename").innerText = ${safeFileName};

    function runUXL() {
      runtime.state = {};

      try {
        currentProgram = UXLParser.parseProgram(currentCode);
        renderCurrentProgram();
      } catch (error) {
        showError(error);
      }
    }

    function renderCurrentProgram() {
      const app = document.getElementById("app");
      app.innerHTML = "";

      try {
        UXLInterpreter.executeNodes(currentProgram, app, runtime);
      } catch (error) {
        showError(error);
      }
    }

    function showError(error) {
      const app = document.getElementById("app");
      app.innerHTML = "";

      const pre = document.createElement("pre");
      pre.className = "error";
      pre.innerText = error.message || String(error);
      app.appendChild(pre);
    }

    runUXL();
  </script>
</body>
</html>`;
}

module.exports = {
  activate,
  deactivate,
};
