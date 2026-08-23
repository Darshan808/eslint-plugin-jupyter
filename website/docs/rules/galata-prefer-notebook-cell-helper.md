# `galata-prefer-notebook-cell-helper`

Prefer the Galata `page.notebook` helper over raw Playwright selectors and keyboard shortcuts for notebook cell operations.

## Why

Galata UI tests that drive notebook cells through raw selectors are brittle: JupyterLab's cell DOM changes between releases, and more importantly raw interactions skip the readiness logic the helpers perform.

## Rule details

The rule only reports when it can prove, statically, that the interaction targets a notebook cell.

A selector interaction is reported when **all** of the following hold:

- the chain is rooted at the `page` fixture (`page.click(sel)`, or `page.locator(sel).first().click()`);
- every selector argument is a fully static string — an interpolated selector such as ``page.locator(`${scope} .jp-Cell`)`` hides the scope it was written with, so it is skipped;
- the selector carries a cell **root** token (`.jp-Cell*`, `.jp-CodeCell`, `.jp-MarkdownCell`, `.jp-RawCell`, `.jp-Notebook-cell`, `[data-windowed-list-index]`) as an actual CSS class or attribute.
- the selector is not scoped to a widget the notebook helper does not drive (`.jp-CodeConsole`, `.jp-Dialog`, `.jp-FileEditor`, `.jp-Terminal`);
- the **trailing** selector segment is markup, not a text match and resolves to the cell or its editor, not something merely rendered inside it. Clicking `.jp-Cell [data-jp-item-name="delete-cell"] jp-button` or `.jp-Cell-inputCollapser` has no helper to recommend, so it is not reported.

The gesture then selects the message:

| Gesture                             | Target          | Suggested helper                                   |
| ----------------------------------- | --------------- | -------------------------------------------------- |
| `fill`, `type`, `pressSequentially` | cell editor     | `page.notebook.setCell()` / `addCell()`            |
| `click`, `dblclick`                 | cell editor     | `page.notebook.enterCellEditingMode()`             |
| `click`, `dblclick`                 | the cell itself | `page.notebook.selectCells()` / `getCellLocator()` |
| `press` with a run shortcut         | cell or editor  | `page.notebook.runCell()` / `run()`                |

### Bare keyboard shortcuts

A bare `page.keyboard.press('Control+Enter')` is reported **only** when the immediately preceding statement in the same block was itself reported by this rule.

The reason is that a bare keyboard press carries no context: the rule sees the string `'Shift+Enter'` and nothing else, so it cannot tell which widget has focus (the console binds it to `console:run-forced`, and Galata ships no console helper to suggest instead), which cell index to pass to `runCell()`, or whether the binding is itself the thing under test — `cells.test.ts` has `test('Run code cell with Ctrl + Enter')`, and both notebook scroll tests press the key precisely _because_ `runCell()` switches to command mode first.

Note that "the test does not want to wait for the kernel" is _not_ a reason to skip the helper: `runCell(index, { wait: false })` runs the cell without awaiting completion while still resetting the execution counter and waiting until the kernel can schedule the execution. Code that presses the shortcut only to avoid the wait should use that option.

### Known limitations

The rule does not report on:

- locators held in variables (`const cell = page.locator('.jp-Cell'); await cell.click();`) or anything derived from `page.notebook.getCellLocator()`;
- bare run shortcuts that are not adjacent to a flagged raw cell interaction;
- fully or partially interpolated selectors.

These are deliberate: each of them would require guessing at the target, and a wrong guess is a false positive.

## Incorrect

```ts
await page
  .locator(
    '.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable="true"]'
  )
  .fill('print("hello")');
await page.keyboard.press('Control+Enter');

await page.click('.jp-Cell-inputArea');
await page.locator('.jp-Cell').nth(2).click();
await page.press('.jp-Cell', 'Shift+Enter');
```

## Correct

```ts
await page.notebook.setCell(0, 'code', 'print("hello")');
await page.notebook.runCell(0);

await page.notebook.enterCellEditingMode(0);
await page.notebook.selectCells(2);

// Not a notebook cell: the console reuses the same editor markup.
await page
  .locator(
    '.jp-CodeConsole-input >> .cm-editor >> .cm-content[contenteditable="true"]'
  )
  .fill('print("hello")');
```

## Options

This rule has no options.
