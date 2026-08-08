# `galata-prefer-menu-helper`

Prefer Galata's `page.menu` helper over raw Playwright selectors for JupyterLab main menu traversal.

## Why

Galata UI tests often walk the main menu with raw Playwright selectors such as `text=File`, `.lm-Menu ul[role="menu"] >> text=New`, or `#jp-mainmenu-file-new`. These raw interactions:

- break easily when menu labels, class names, or ARIA roles change;
- depend on whatever menu happens to be open and on hover timing, so any leftover menu state changes the target;
- repeat the same multi-step traversal across many test files.

`page.menu.clickMenuItem('File>New>Terminal')` closes any open menu first, walks nested menus consistently, and waits for each submenu to become active. `page.menu.open(path)`, `page.menu.isOpen(path)`, and `page.menu.getMenuItem(path)` cover the remaining cases.

## Rule details

The rule flags Playwright clicks on the `page` fixture — both direct calls (`page.click(selector)`) and locator chains (`page.locator(...).getByText(...).click()`, including `.first()`/`.last()`/`.nth()` steps) — when the selector or text contains a known menu marker:

- a menu bar item: a single-segment `#jp-mainmenu-*` id, or an exact top-level menu label (`File`, `Edit`, `View`, `Run`, `Kernel`, `Tabs`, `Settings`, `Help`), reported as `preferMenuOpen`;
- an item inside an open menu: the Lumino popup classes (`.lm-Menu`, `.lm-Menu-item`, `.lm-Menu-content`, …), a `role="menu"` container, or a `#jp-mainmenu-<menu>-<submenu>` id together with an item label, reported as `preferClickMenuItem`;
- any other interaction on menu markup, reported as the generic `preferMenuHelper`.

## Incorrect

```ts
await page.click('text=File');
await page.click('.lm-Menu ul[role="menu"] >> text=New');
await page.click('#jp-mainmenu-file-new >> text=Terminal');
await page.click('li[role="menuitem"]:has-text("Kernel")');
await page.locator('.lm-MenuBar-item').getByText('File').click();
```

## Correct

```ts
await page.menu.clickMenuItem('File>New>Terminal');
await page.menu.open('File');
await page.menu.closeAll();
```

## Options

This rule has no options.
