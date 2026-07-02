# `galata-prefer-notebook-cell-helper`

Prefer Galata's `page.notebook` cell helpers over raw Playwright selectors and keyboard shortcuts to set, select, or run notebook cells.

## Why

Galata UI tests often manipulate notebook cells through the raw DOM (`.jp-Cell-inputArea`, `.jp-InputArea-editor`, CodeMirror internals) or run them with raw keyboard shortcuts (`Control+Enter`, `Shift+Enter`). These approaches depend on the notebook's DOM structure and skip the readiness checks the helpers provide: `page.notebook.runCell()` resets execution counters and waits until the kernel can schedule execution, so raw shortcuts are a common source of timing failures.

## Rule details

The rule flags:

- **Filling the cell editor directly** — `page.fill(selector, source)` or `page.locator(selector).fill(source)` where the selector contains a cell marker (`.jp-Cell*`, `.jp-InputArea*`, `.jp-Notebook-cell`) → recommends `page.notebook.setCell(index, type, source)`;
- **Run-cell keyboard shortcuts** — `page.keyboard.press('Control+Enter')` or `page.keyboard.press('Shift+Enter')` → recommends `page.notebook.runCell(index)` / `page.notebook.runCellByCell()`;
- **Other interactions with the cell DOM** — clicks, double-clicks, `waitForSelector`, … on cell selectors → recommends the matching cell helper (`selectCells()`, `enterCellEditingMode()`, `getCellOutput()`, …).

Bare CodeMirror selectors (`.cm-editor`, `.cm-content`) without a cell marker are not flagged, since they also appear in file editor and console tests. Other keyboard shortcuts (e.g. `Escape`, `Control+S`) are not flagged. Selectors and keys built from string literals and template literals (their static parts) are analyzed; fully dynamic values are ignored. Receivers other than a variable named `page` are out of scope.

The recommended configuration enables this rule only for test files (`**/*.spec.{ts,js}`, `**/*.test.{ts,js}`). It should not be enabled for the Galata helper implementation itself (e.g. `galata/src/helpers/**`), which necessarily contains low-level Playwright operations.

## Incorrect

```ts
await page
  .locator(
    '.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable="true"]'
  )
  .fill('print("hello")');
await page.keyboard.press('Control+Enter');
```

## Correct

```ts
await page.notebook.setCell(0, 'code', 'print("hello")');
await page.notebook.runCell(0);
```

## Options

This rule has no options.
