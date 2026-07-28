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
await page.filebrowser.open('data/bar.json');
```

## Options

This rule has no options.
