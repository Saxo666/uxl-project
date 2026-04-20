const UXLParser = (() => {
  function parseProgram(code) {
    const lines = code.split("\n").map((raw, index) => ({
      raw,
      text: raw.trim(),
      indent: getIndentLevel(raw),
      lineNumber: index + 1,
    }));

    const [nodes, nextIndex] = parseBlock(lines, 0, 0);

    if (nextIndex < lines.length) {
      const line = lines[nextIndex];
      throw new Error(`Unexpected content at line ${line.lineNumber}`);
    }

    return nodes;
  }

  function parseBlock(lines, startIndex, expectedIndent) {
    const nodes = [];
    let index = startIndex;

    while (index < lines.length) {
      const line = lines[index];

      if (line.text === "") {
        index += 1;
        continue;
      }

      if (line.indent < expectedIndent) {
        break;
      }

      if (line.indent > expectedIndent) {
        throw new Error(`Unexpected indentation at line ${line.lineNumber}`);
      }

      const result = parseStatement(lines, index, expectedIndent);
      nodes.push(result.node);
      index = result.nextIndex;
    }

    return [nodes, index];
  }

  function parseStatement(lines, index, indent) {
    const line = lines[index];
    const text = line.text;

    const stateMatch = text.match(/^state\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (stateMatch) {
      return {
        node: { type: "state", name: stateMatch[1], expression: stateMatch[2].trim() },
        nextIndex: index + 1,
      };
    }

    const textMatch = text.match(/^text\s+"([\s\S]*)"$/);
    if (textMatch) {
      return {
        node: { type: "text", content: textMatch[1] },
        nextIndex: index + 1,
      };
    }

    const inputMatch = text.match(/^input\s+([A-Za-z_]\w*)$/);
    if (inputMatch) {
      return {
        node: { type: "input", name: inputMatch[1] },
        nextIndex: index + 1,
      };
    }

    const buttonMatch = text.match(/^button\s+"([\s\S]+)"\s*:\s*$/);
    if (buttonMatch) {
      const bodyInfo = parseIndentedChildBlock(lines, index, indent);
      return {
        node: { type: "button", label: buttonMatch[1], body: bodyInfo.nodes },
        nextIndex: bodyInfo.nextIndex,
      };
    }

    const eventMatch = text.match(/^(onClick)\s*=>\s*(.+)$/);
    if (eventMatch) {
      const eventBody = parseInlineEventBody(line.lineNumber, eventMatch[2]);
      return {
        node: { type: "event", name: eventMatch[1], body: eventBody },
        nextIndex: index + 1,
      };
    }

    const ifMatch = text.match(/^if\s+(.+)\s*:\s*$/);
    if (ifMatch) {
      return parseIfStatement(lines, index, indent, ifMatch[1].trim());
    }

    const assignMatch = text.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch) {
      return {
        node: { type: "assign", name: assignMatch[1], expression: assignMatch[2].trim() },
        nextIndex: index + 1,
      };
    }

    throw new Error(`Unsupported syntax at line ${line.lineNumber}: ${line.text}`);
  }

  function parseIfStatement(lines, index, indent, firstCondition) {
    const branches = [];
    let currentIndex = index;

    const firstBody = parseIndentedChildBlock(lines, currentIndex, indent);
    branches.push({
      condition: firstCondition,
      body: firstBody.nodes,
    });
    currentIndex = firstBody.nextIndex;

    while (currentIndex < lines.length) {
      const line = lines[currentIndex];

      if (line.text === "") {
        currentIndex += 1;
        continue;
      }

      if (line.indent !== indent) {
        break;
      }

      const elifMatch = line.text.match(/^elif\s+(.+)\s*:\s*$/);
      if (elifMatch) {
        const elifBody = parseIndentedChildBlock(lines, currentIndex, indent);
        branches.push({
          condition: elifMatch[1].trim(),
          body: elifBody.nodes,
        });
        currentIndex = elifBody.nextIndex;
        continue;
      }

      if (/^else\s*:\s*$/.test(line.text)) {
        const elseBody = parseIndentedChildBlock(lines, currentIndex, indent);
        branches.push({
          condition: null,
          body: elseBody.nodes,
        });
        currentIndex = elseBody.nextIndex;
      }

      break;
    }

    return {
      node: { type: "if", branches },
      nextIndex: currentIndex,
    };
  }

  function parseIndentedChildBlock(lines, index, parentIndent) {
    let nextIndex = index + 1;

    while (nextIndex < lines.length && lines[nextIndex].text === "") {
      nextIndex += 1;
    }

    if (nextIndex >= lines.length) {
      throw new Error(`Expected an indented block after line ${lines[index].lineNumber}`);
    }

    const childIndent = lines[nextIndex].indent;

    if (childIndent <= parentIndent) {
      throw new Error(`Expected an indented block after line ${lines[index].lineNumber}`);
    }

    const [nodes, finalIndex] = parseBlock(lines, nextIndex, childIndent);
    return { nodes, nextIndex: finalIndex };
  }

  function parseInlineEventBody(lineNumber, bodyText) {
    const inlineStatement = bodyText.trim();

    if (inlineStatement === "") {
      throw new Error(`Missing event body at line ${lineNumber}`);
    }

    const assignMatch = inlineStatement.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (!assignMatch) {
      throw new Error(`Unsupported event syntax at line ${lineNumber}`);
    }

    return [{
      type: "assign",
      name: assignMatch[1],
      expression: assignMatch[2].trim(),
    }];
  }

  function getIndentLevel(rawLine) {
    const match = rawLine.match(/^[ \t]*/);
    return (match ? match[0] : "").replace(/\t/g, "    ").length;
  }

  return {
    parseProgram,
  };
})();
