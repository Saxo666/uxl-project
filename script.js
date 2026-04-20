let currentProgram = [];
let currentCode = "";
const runtime = UXLInterpreter.createRuntime({
  renderCurrentProgram,
});

function runUXL() {
  runtime.state = {};
  currentCode = document.getElementById("codeEditor").value;

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
  pre.style.color = "#b42318";
  pre.style.background = "#fef3f2";
  pre.style.border = "1px solid #fecdca";
  pre.style.borderRadius = "8px";
  pre.style.padding = "12px";
  pre.style.whiteSpace = "pre-wrap";
  pre.innerText = error.message || String(error);
  app.appendChild(pre);
}

runUXL();
