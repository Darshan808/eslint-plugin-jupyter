# `galata-prefer-context-menu-helper`

Prefer Galata's `page.filebrowser` and `page.notebook` helpers over right-click context menu flows to open files.

## Why

Opening a file with a specific factory — or a notebook without a kernel — is often written as a manual context menu sequence: right-click the file browser item, hover `Open With`, click the factory entry, then wait for the panel. Every step depends on menu state, hover timing, and label text, and the same boilerplate is repeated across many test files.

`page.filebrowser.open(file, factory)` and `page.notebook.open(name, { noKernel: true })` cover the whole flow in one call, including the waits.

## Rule details

The rule flags Playwright interaction calls on the `page` fixture — both direct calls (`page.click(selector, options)`, `page.hover(selector)`, …) and locator chains (`page.locator(selector).click(options)`, …) — for the three steps of the manual flow:

- a right-click (`{ button: 'right' }`) on a file browser item (`.jp-DirListing*`, `File Browser Section`) → recommends `page.filebrowser.open(file, factory)` or `page.notebook.open(name, { noKernel: true })`;
- an `Open With` menu entry (matched as whole words) → recommends `page.filebrowser.open(file, factory)`;
- a `(no kernel)` menu entry → recommends `page.notebook.open(name, { noKernel: true })`.

Left-clicks on file browser items are covered by [galata-prefer-filebrowser-helper](./galata-prefer-filebrowser-helper) instead. Right-clicks outside the file browser are not flagged. Selectors built from string literals and template literals (their static parts) are analyzed; fully dynamic selectors are ignored. Receivers other than a variable named `page` are out of scope.

The recommended configuration enables this rule only for test files (`**/*.spec.{ts,js}`, `**/*.test.{ts,js}`). It should not be enabled for the Galata helper implementation itself (e.g. `galata/src/helpers/**`), which necessarily contains low-level Playwright operations.

## Incorrect

```ts
await page.click(`.jp-DirListing-item span:has-text("${NOTEBOOK_NAME}")`, {
  button: 'right'
});
await page.hover('text=Open With');
await page.click('text=Notebook (no kernel)');
await page.waitForSelector('.jp-NotebookPanel');
```

## Correct

```ts
await page.notebook.open(NOTEBOOK_NAME, { noKernel: true });
await page.filebrowser.open('README.md', 'Markdown Preview');
```

## Options

This rule has no options.
