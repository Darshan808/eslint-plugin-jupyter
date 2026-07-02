# `galata-prefer-filebrowser-helper`

Prefer Galata's `page.filebrowser` and `page.notebook` helpers over raw Playwright selectors for JupyterLab file browser interactions.

## Why

Galata UI tests often drive the file browser with raw Playwright selectors such as `.jp-DirListing-item`, `.jp-BreadCrumbs-home`, or `text=` matches inside the `File Browser Section` region. These raw interactions:

- break easily when class names, ARIA labels, or DOM structure change;
- skip the built-in waits and readiness checks that Galata helpers provide, causing flaky tests;
- repeat the same multi-step traversal logic across many test files.

`page.filebrowser.open()` handles nested directories, uses the accessible file browser region, and waits for the tab to become visible. `page.notebook.openByPath()` additionally waits for the notebook panel to be ready.

## Rule details

The rule flags Playwright interaction calls on the `page` fixture — both direct calls (`page.click(selector)`, `page.dblclick(selector)`, `page.waitForSelector(selector)`, …) and locator chains (`page.locator(selector).click()`, `page.getByText(text).dblclick()`, …) — when the selector or text contains a known file browser marker:

- a `.ipynb` file name → recommends `page.notebook.openByPath(path)`;
- `.jp-BreadCrumbs*` classes → recommends `page.filebrowser.openHomeDirectory()`;
- `File Browser Section` or `.jp-DirListing*` classes → recommends `page.filebrowser.open(path)`.

Selectors built from string literals and template literals (their static parts) are analyzed; fully dynamic selectors are ignored. Receivers other than a variable named `page` are out of scope. Right-click interactions (`{ button: 'right' }`) are not flagged by this rule — context menu flows are covered by [galata-prefer-context-menu-helper](./galata-prefer-context-menu-helper). Selectors targeting main area tabs (`[role="main"]`) are also skipped — those are covered by [galata-prefer-sidebar-activity-helper](./galata-prefer-sidebar-activity-helper).

The recommended configuration enables this rule only for test files (`**/*.spec.{ts,js}`, `**/*.test.{ts,js}`). It should not be enabled for the Galata helper implementation itself (e.g. `galata/src/helpers/**`), which necessarily contains low-level Playwright operations.

## Incorrect

```ts
await page.dblclick('[aria-label="File Browser Section"] >> text=notebooks');
await page.dblclick('text=Data.ipynb');
await page.click('.jp-BreadCrumbs-home svg');
await page.locator('.jp-DirListing-item').dblclick();
```

## Correct

```ts
await page.notebook.openByPath('notebooks/Data.ipynb');
await page.filebrowser.openHomeDirectory();
await page.filebrowser.open('data/bar.vl.json');
```

## Options

This rule has no options.
