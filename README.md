# UXL Language

VS Code language support for `.uxl` files.

## Features

- File association for `.uxl`
- Syntax highlighting for UXL keywords, operators, strings, booleans, and interpolations
- Snippets for `state`, `text`, `input`, `button`, `if/elif/else`, and assignment
- Python-like `for ... in range(...)` loops
- `Run UXL Preview` command for opening a live preview from VS Code

## Install Locally In VS Code

1. Open this project folder in VS Code.
2. Run `npm install`.
3. Press `F5` to launch an Extension Development Host.
4. In the new VS Code window, open a `.uxl` file.
5. Run `Run UXL Preview` from the Command Palette or click the editor title button.

If you want to package it later, run `npm run package` to produce a `.vsix`.

## UXL Example

```uxl
state count = 0
state step = 1
state total = 0

total = count * step

text "Count: {count}"
text "Total: {total}"

input step

button "Increase":
    onClick => count = count + step

if count >= 10 and not false:
    text "High"
elif count >= 5:
    text "Medium"
else:
    text "Low"

for i in range(1, 4):
    text "Item {i}"
```

## Example File

A ready-to-try example is available at [examples/getting-started.uxl](./examples/getting-started.uxl).
