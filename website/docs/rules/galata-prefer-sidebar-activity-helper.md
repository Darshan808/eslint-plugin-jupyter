# `galata-prefer-sidebar-activity-helper`

Prefer Galata's `page.sidebar` and `page.activity` helpers over raw title/text selectors for sidebars and main area tabs.

## Why

Galata UI tests often select sidebars by their title attribute (`[title="Running Terminals and Kernels"]`) or main area tabs by text inside the dock panel (`div[role="main"] >> text=Lorenz.ipynb`). Raw title selectors break with any label change and carry no activation waits.

`page.sidebar.openTab()` validates the tab exists, checks whether it is already open, and waits for activation. `page.activity.activateTab()` does the same for main area tabs.

## Rule details

The rule flags Playwright interaction calls on the `page` fixture — both direct calls (`page.click(selector)`, `page.waitForSelector(selector)`, …) and locator chains (`page.locator(selector).click()`, …) — when the selector targets:

- **a known sidebar tab by title** — `[title="<known title>"]` where the title is one of `File Browser`, `Running Terminals and Kernels`, `Table of Contents`, `Extension Manager`, `Property Inspector`, or `Debugger` → recommends `page.sidebar.openTab(id)` with the matching tab id (e.g. `jp-running-sessions`);
- **a main area tab** — selectors containing `[role="main"]` or `.lm-DockPanel-tabBar` → recommends `page.activity.activateTab(name)`.

Title selectors for anything else (e.g. toolbar buttons like `[title="Save the notebook"]`) are not flagged. Selectors built from string literals and template literals (their static parts) are analyzed; fully dynamic selectors are ignored. Receivers other than a variable named `page` are out of scope.

The recommended configuration enables this rule only for test files (`**/*.spec.{ts,js}`, `**/*.test.{ts,js}`). It should not be enabled for the Galata helper implementation itself (e.g. `galata/src/helpers/**`), which necessarily contains low-level Playwright operations.

## Incorrect

```ts
await page.click('[title="Running Terminals and Kernels"]');
await page.click('div[role="main"] >> text=Lorenz.ipynb');
await page.locator('[title="Property Inspector"]').click();
```

## Correct

```ts
await page.sidebar.openTab('jp-running-sessions');
await page.activity.activateTab('Lorenz.ipynb');
await page.sidebar.openTab('jp-property-inspector');
```

## Options

This rule has no options.
