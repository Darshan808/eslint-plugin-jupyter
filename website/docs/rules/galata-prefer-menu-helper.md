# `galata-prefer-menu-helper`

Prefer Galata's `page.menu` helper over raw Playwright selectors for JupyterLab main menu traversal.

## Why

Galata UI tests often walk the main menu with raw Playwright selectors such as `text=File`, `.lm-Menu ul[role="menu"] >> text=New`, or `#jp-mainmenu-file-new`. These raw interactions:

- break easily when menu labels, class names, or ARIA roles change;
- depend on whatever menu happens to be open and on hover timing, so any leftover menu state changes the target;
- repeat the same multi-step traversal across many test files.

`page.menu.clickMenuItem('File>New>Terminal')` closes any open menu first, walks nested menus consistently, and waits for each submenu to become active. `page.menu.open(path)`, `page.menu.isOpen(path)`, and `page.menu.getMenuItem(path)` cover the remaining cases.

## Rule details

The rule flags Playwright interaction calls on the `page` fixture — both direct calls (`page.click(selector)`, `page.hover(selector)`, …) and locator chains (`page.locator(...).getByText(...).click()`, including `.first()`/`.last()`/`.nth()` steps) — when the selector or text contains a known menu marker:

- a menu bar item: a single-segment `#jp-mainmenu-*` id, or an exact top-level menu label (`File`, `Edit`, `View`, `Run`, `Kernel`, `Tabs`, `Settings`, `Help`), reported as `preferMenuOpen`;
- an item inside an open menu: the Lumino popup classes (`.lm-Menu`, `.lm-Menu-item`, `.lm-Menu-content`, …), a `role="menu"` container, or a `#jp-mainmenu-<menu>-<submenu>` id together with an item label, reported as `preferClickMenuItem`;
- any other interaction on menu markup, reported as the generic `preferMenuHelper`.

The rule is deliberately conservative — it prefers missing a violation to reporting a false one:

- Only `click` and `hover` are considered. `hover` matters because Lumino switches the open submenu on hover. Every other gesture (`dblclick`, `tap`, `press`, `fill`, `check`, `selectOption`, …) and every wait (`waitForSelector`, `locator(...).waitFor()`) is ignored: nothing drives a Lumino menu that way, so a menu-ish selector combined with one of them means the test is doing something else.
- A top-level menu label only counts when it is the whole selector (`page.click('text=File')`) or when the selector also carries menu markup (`page.click('li[role="menuitem"]:has-text("File")')`). A label under any other scope refers to different UI — `page.dblclick('#filebrowser >> text="File"')` clicks a _file_ named `File`, and `page.click('button:has-text("Run")')` clicks a button — so neither is flagged.
- A label that merely contains a top-level menu name, such as `text=New File` or `text=Close Tab`, is never treated as a menu bar item.
- Right-clicks (`{ button: 'right' }`) are skipped, since they open the context menu rather than the main menu.
- Matching is case-sensitive, so lower-case `-menu` widgets such as `.jp-PauseOnExceptions-menu` are not mistaken for Lumino menu markup.

Known limitations:

- Locators stored in variables (`const item = page.locator(...); await item.click();`) are not tracked.
- A popup opened by a right-click uses the same markup as a main menu popup, so clicks on context menu items are flagged too. The `page.menu` helper family covers those as well (`page.menu.openContextMenu(selector)`, `page.menu.getMenuItemInMenu(...)`).

## Incorrect

```ts
await page.click('text=File');
await page.click('.lm-Menu ul[role="menu"] >> text=New');
await page.click('#jp-mainmenu-file-new >> text=Terminal');
await page.click('li[role="menuitem"]:has-text("Kernel")');
await page.hover('ul[role="menu"] >> text=New File');
```

## Correct

```ts
await page.menu.clickMenuItem('File>New>Terminal');
await page.menu.open('File');
await page.menu.closeAll();
```

## Options

This rule has no options.
