# `galata-prefer-menu-helper`

Prefer Galata's `page.menu` helper over raw Playwright selectors for JupyterLab main menu interactions.

## Why

Galata UI tests often drive the main menu with raw Playwright selectors such as `text=File`, `.lm-MenuBar-item`, `.lm-Menu ul[role="menu"]`, or `#jp-mainmenu-*` ids. Raw menu clicks are brittle: any already-open menu, hover timing, or label change can shift the target and make the test flaky.

`page.menu.clickMenuItem('File>New>Terminal')` closes existing menus first, walks nested submenus consistently, and waits for submenu activation. `page.menu.open('File')` does the same for simply opening a menu.

## Rule details

The rule flags Playwright interaction calls on the `page` fixture — both direct calls (`page.click(selector)`, `page.hover(selector)`, `page.waitForSelector(selector)`, …) and locator chains (`page.locator(selector).click()`, …) — when the selector contains a known main menu marker:

- `#jp-mainmenu-*` ids, `.lm-Menu` classes, or `[role="menu"]`/`[role="menuitem"]` selectors → recommends `page.menu.clickMenuItem(path)`;
- `.lm-MenuBar*` classes or an exact top-level label (`text=File`, `text=Edit`, `text=View`, `text=Run`, `text=Kernel`, `text=Tabs`, `text=Settings`, `text=Help`) → recommends `page.menu.open(name)`.

Top-level labels are matched exactly, so selectors like `text=File Browser` are not flagged. Selectors built from string literals and template literals (their static parts) are analyzed; fully dynamic selectors are ignored. Receivers other than a variable named `page` are out of scope.

The recommended configuration enables this rule only for test files (`**/*.spec.{ts,js}`, `**/*.test.{ts,js}`). It should not be enabled for the Galata helper implementation itself (e.g. `galata/src/helpers/**`), which necessarily contains low-level Playwright operations.

## Incorrect

```ts
await page.click('text=File');
await page.click('.lm-Menu ul[role="menu"] >> text=New');
await page.click('#jp-mainmenu-file-new >> text=Terminal');
```

## Correct

```ts
await page.menu.open('File');
await page.menu.clickMenuItem('File>New>Terminal');
```

## Options

This rule has no options.
