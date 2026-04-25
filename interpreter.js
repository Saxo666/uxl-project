const UXLInterpreter = (() => {
  function createRuntime(options = {}) {
    return {
      state: {},
      renderCurrentProgram: options.renderCurrentProgram || (() => {}),
    };
  }

  function executeNodes(nodes, app, runtime) {
    for (const node of nodes) {
      executeNode(node, app, runtime);
    }
  }

  function executeNode(node, app, runtime) {
    if (node.type === "state") {
      if (runtime.state[node.name] === undefined) {
        runtime.state[node.name] = evaluateExpression(node.expression, runtime.state);
      }
      return;
    }

    if (node.type === "assign") {
      runtime.state[node.name] = evaluateExpression(node.expression, runtime.state);
      return;
    }

    if (node.type === "text") {
      const p = document.createElement("p");
      p.innerText = interpolateText(node.content, runtime.state);
      app.appendChild(p);
      return;
    }

    if (node.type === "input") {
      const input = document.createElement("input");
      input.placeholder = node.name;
      input.value = runtime.state[node.name] ?? "";

      input.addEventListener("input", (event) => {
        const rawValue = event.target.value;
        runtime.state[node.name] = coerceInputValue(rawValue);
        runtime.renderCurrentProgram();
      });

      app.appendChild(input);
      return;
    }

    if (node.type === "button") {
      const button = document.createElement("button");
      button.innerText = node.label;

      const clickHandler = node.body.find((child) => child.type === "event" && child.name === "onClick");

      if (clickHandler) {
        button.onclick = () => {
          executeNodes(clickHandler.body, app, runtime);
          runtime.renderCurrentProgram();
        };
      }

      app.appendChild(button);
      return;
    }

    if (node.type === "if") {
      for (const branch of node.branches) {
        if (!branch.condition || truthy(evaluateExpression(branch.condition, runtime.state))) {
          executeNodes(branch.body, app, runtime);
          break;
        }
      }
      return;
    }

    if (node.type === "for") {
      executeForLoop(node, app, runtime);
    }
  }

  function interpolateText(content, state) {
    return content.replace(/\{(.*?)\}/g, (_, expression) => {
      const value = evaluateExpression(expression.trim(), state);
      return value ?? "";
    });
  }

  function coerceInputValue(value) {
    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return "";
    }

    if (/^-?\d*\.?\d+$/.test(trimmedValue)) {
      return Number(trimmedValue);
    }

    if (trimmedValue === "true") {
      return true;
    }

    if (trimmedValue === "false") {
      return false;
    }

    return value;
  }

  function evaluateExpression(source, state) {
    const tokens = tokenizeExpression(source);
    const parser = createExpressionParser(tokens, source, state);
    const value = parser.parseExpression();

    if (!parser.isAtEnd()) {
      throw new Error(`Unexpected token "${parser.peek().value}" in expression: ${source}`);
    }

    return value;
  }

  function executeForLoop(node, app, runtime) {
    const rangeValues = evaluateRangeArgs(node.rangeArgs, runtime.state);
    const previousValue = Object.prototype.hasOwnProperty.call(runtime.state, node.variable)
      ? runtime.state[node.variable]
      : undefined;
    const hadPreviousValue = Object.prototype.hasOwnProperty.call(runtime.state, node.variable);

    for (const value of buildRange(rangeValues)) {
      runtime.state[node.variable] = value;
      executeNodes(node.body, app, runtime);
    }

    if (hadPreviousValue) {
      runtime.state[node.variable] = previousValue;
    } else {
      delete runtime.state[node.variable];
    }
  }

  function evaluateRangeArgs(rangeArgs, state) {
    return rangeArgs.map((arg) => Number(evaluateExpression(arg, state)));
  }

  function buildRange(rangeValues) {
    let start = 0;
    let stop = 0;
    let step = 1;

    if (rangeValues.length === 1) {
      [stop] = rangeValues;
    } else if (rangeValues.length === 2) {
      [start, stop] = rangeValues;
    } else {
      [start, stop, step] = rangeValues;
    }

    if (!Number.isFinite(start) || !Number.isFinite(stop) || !Number.isFinite(step)) {
      throw new Error("range() arguments must evaluate to numbers");
    }

    if (step === 0) {
      throw new Error("range() step cannot be 0");
    }

    const values = [];

    if (step > 0) {
      for (let value = start; value < stop; value += step) {
        values.push(value);
      }
    } else {
      for (let value = start; value > stop; value += step) {
        values.push(value);
      }
    }

    return values;
  }

  function tokenizeExpression(source) {
    const tokens = [];
    let index = 0;

    while (index < source.length) {
      const char = source[index];

      if (/\s/.test(char)) {
        index += 1;
        continue;
      }

      const twoChars = source.slice(index, index + 2);
      if (["==", "!=", ">=", "<="].includes(twoChars)) {
        tokens.push({ type: "operator", value: twoChars });
        index += 2;
        continue;
      }

      if ("+-*/()<>".includes(char)) {
        tokens.push({
          type: char === "(" || char === ")" ? "paren" : "operator",
          value: char,
        });
        index += 1;
        continue;
      }

      if (char === '"') {
        let value = "";
        index += 1;

        while (index < source.length && source[index] !== '"') {
          if (source[index] === "\\" && index + 1 < source.length) {
            value += source[index + 1];
            index += 2;
            continue;
          }

          value += source[index];
          index += 1;
        }

        if (source[index] !== '"') {
          throw new Error(`Unterminated string in expression: ${source}`);
        }

        tokens.push({ type: "string", value });
        index += 1;
        continue;
      }

      const numberMatch = source.slice(index).match(/^\d*\.?\d+/);
      if (numberMatch) {
        tokens.push({ type: "number", value: numberMatch[0] });
        index += numberMatch[0].length;
        continue;
      }

      const identifierMatch = source.slice(index).match(/^[A-Za-z_]\w*/);
      if (identifierMatch) {
        const value = identifierMatch[0];
        const keywords = new Set(["and", "or", "not", "true", "false"]);

        tokens.push({
          type: keywords.has(value) ? "keyword" : "identifier",
          value,
        });
        index += value.length;
        continue;
      }

      throw new Error(`Unexpected character "${char}" in expression: ${source}`);
    }

    return tokens;
  }

  function createExpressionParser(tokens, source, state) {
    let current = 0;

    function parseExpression() {
      return parseOr();
    }

    function parseOr() {
      let left = parseAnd();

      while (matchKeyword("or")) {
        const right = parseAnd();
        left = truthy(left) || truthy(right);
      }

      return left;
    }

    function parseAnd() {
      let left = parseEquality();

      while (matchKeyword("and")) {
        const right = parseEquality();
        left = truthy(left) && truthy(right);
      }

      return left;
    }

    function parseEquality() {
      let left = parseComparison();

      while (matchOperator("==") || matchOperator("!=")) {
        const operator = previous().value;
        const right = parseComparison();
        left = operator === "==" ? left == right : left != right;
      }

      return left;
    }

    function parseComparison() {
      let left = parseTerm();

      while (
        matchOperator(">") ||
        matchOperator("<") ||
        matchOperator(">=") ||
        matchOperator("<=")
      ) {
        const operator = previous().value;
        const right = parseTerm();

        if (operator === ">") left = left > right;
        if (operator === "<") left = left < right;
        if (operator === ">=") left = left >= right;
        if (operator === "<=") left = left <= right;
      }

      return left;
    }

    function parseTerm() {
      let left = parseFactor();

      while (matchOperator("+") || matchOperator("-")) {
        const operator = previous().value;
        const right = parseFactor();

        if (operator === "+") {
          left = typeof left === "string" || typeof right === "string"
            ? String(left) + String(right)
            : Number(left) + Number(right);
        } else {
          left = Number(left) - Number(right);
        }
      }

      return left;
    }

    function parseFactor() {
      let left = parseUnary();

      while (matchOperator("*") || matchOperator("/")) {
        const operator = previous().value;
        const right = parseUnary();

        if (operator === "*") {
          left = Number(left) * Number(right);
        } else {
          left = Number(right) === 0 ? 0 : Number(left) / Number(right);
        }
      }

      return left;
    }

    function parseUnary() {
      if (matchKeyword("not")) {
        return !truthy(parseUnary());
      }

      if (matchOperator("-")) {
        return -Number(parseUnary());
      }

      if (matchOperator("+")) {
        return Number(parseUnary());
      }

      return parsePrimary();
    }

    function parsePrimary() {
      if (matchType("number")) {
        return Number(previous().value);
      }

      if (matchType("string")) {
        return previous().value;
      }

      if (matchKeyword("true")) {
        return true;
      }

      if (matchKeyword("false")) {
        return false;
      }

      if (matchType("identifier")) {
        return state[previous().value] ?? 0;
      }

      if (matchParen("(")) {
        const value = parseExpression();
        consumeParen(")", `Expected ")" in expression: ${source}`);
        return value;
      }

      throw new Error(`Invalid expression: ${source}`);
    }

    function matchType(type) {
      if (check(type)) {
        current += 1;
        return true;
      }

      return false;
    }

    function matchOperator(value) {
      if (check("operator", value)) {
        current += 1;
        return true;
      }

      return false;
    }

    function matchKeyword(value) {
      if (check("keyword", value)) {
        current += 1;
        return true;
      }

      return false;
    }

    function matchParen(value) {
      if (check("paren", value)) {
        current += 1;
        return true;
      }

      return false;
    }

    function consumeParen(value, message) {
      if (matchParen(value)) {
        return;
      }

      throw new Error(message);
    }

    function check(type, value) {
      if (isAtEnd()) {
        return false;
      }

      const token = tokens[current];
      return token.type === type && (value === undefined || token.value === value);
    }

    function peek() {
      return tokens[current];
    }

    function previous() {
      return tokens[current - 1];
    }

    function isAtEnd() {
      return current >= tokens.length;
    }

    return {
      parseExpression,
      isAtEnd,
      peek,
    };
  }

  function truthy(value) {
    return Boolean(value);
  }

  return {
    createRuntime,
    executeNodes,
  };
})();
