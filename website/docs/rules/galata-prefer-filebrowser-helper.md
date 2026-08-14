# `galata-prefer-filebrowser-helper`

Prefer Galata's `page.filebrowser` and `page.notebook` helpers over raw Playwright selectors for JupyterLab file browser interactions.

## Why

Galata UI tests often drive the file browser with raw Playwright selectors such as `.jp-DirListing-item`, `.jp-BreadCrumbs-home`, or `text=` matches inside the `File Browser Section` region. These raw interactions:

- break easily when class names, ARIA labels, or DOM structure change;
- skip the built-in waits and readiness checks that Galata helpers provide, causing flaky tests;
- repeat the same multi-step traversal logic across many test files.

`page.filebrowser.open()` handles nested directories, uses the accessible file browser region, and waits for the tab to become visible. `page.notebook.openByPath()` additionally waits for the notebook panel to be ready.

## Rule details

The rule flags Playwright interaction calls on the `page` fixture, both direct calls (`page.dblclick(selector)`, …) and locator chains (`page.locator(...).getByText(...).dblclick()`, including `.first()`/`.last()`/`.nth()` steps), when the selector or text contains a known file browser marker.

A double-clicked name without a dot in it is reported as a directory open, because `page.filebrowser.open()` waits for a document tab that a directory never opens. `page.filebrowser.openDirectory()` is recommended instead, and where the directory is opened only to reach a file inside it, both steps collapse into a single `page.filebrowser.open()` or `page.notebook.openByPath()` call, which open the intermediate directories themselves.

Selectors scoped to a dialog (`.jp-Dialog`) are not reported: the file selector dialog reuses the directory listing markup, but the `page.filebrowser` helpers only drive the sidebar widget.

The receiver is matched by the name `page`, whether it comes from the Galata fixture or from a bare `@playwright/test` one. A test driving JupyterLab without the Galata fixture has no helpers on its `page`, and is reported on purpose: surfacing the helpers, and the fixture that carries them, is the point of the rule. Where that is not wanted, disable the rule for those files.

Known limitation: locators stored in variables (`const item = page.locator(...); await item.dblclick();`) are not tracked.

## Incorrect

```ts
await page.dblclick('[aria-label="File Browser Section"] >> text=notebooks');
await page.dblclick('text=Data.ipynb');
await page.click('.jp-BreadCrumbs-home svg');
await page.locator('.jp-DirListing-item').dblclick();
await page.locator('#filebrowser').getByText('notebooks').dblclick();
```

## Correct

```ts
await page.notebook.openByPath('notebooks/Data.ipynb');
await page.filebrowser.openHomeDirectory();
await page.filebrowser.openDirectory('notebooks');
await page.filebrowser.open('data/bar.json');
// The file selector dialog is out of scope
await page.locator('.jp-Dialog .jp-DirListing-itemName').first().dblclick();
```

## Options

This rule has no options.
