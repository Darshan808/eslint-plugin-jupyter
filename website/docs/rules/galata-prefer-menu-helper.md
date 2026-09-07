# `galata-prefer-menu-helper`

Prefer Galata's `page.menu` helper over raw Playwright selectors for JupyterLab main menu traversal.

## Why

Galata UI tests often walk the main menu with raw Playwright selectors such as `text=File`, `.lm-Menu ul[role="menu"] >> text=New`, or `#jp-mainmenu-file-new`. These raw interactions:

- break easily when menu labels, class names, or ARIA roles change;
- depend on whatever menu happens to be open and on hover timing, so any leftover menu state changes the target;
- repeat the same multi-step traversal across many test files.

`page.menu.clickMenuItem('File>New>Terminal')` closes any open menu first, walks nested menus consistently, and waits for each submenu to become active. `page.menu.openLocator(path)`, `page.menu.isOpen(path)` and `page.menu.getMenuItemLocator(path)` cover the remaining cases. `page.menu.open(path)` and `page.menu.getMenuItem(path)` are the deprecated forms of the first and the third.

## Rule details

The rule flags Playwright clicks on the `page` fixture — both direct calls (`page.click(selector)`) and locator chains (`page.locator(...).getByText(...).click()`, `page.getByRole('menuitem', { name }).click()`, including `.first()`/`.last()`/`.nth()` steps) — when the selector or text contains a known menu marker:

- a menu bar item: the `.lm-MenuBar*` classes, or an exact top-level menu label (`File`, `Edit`, `View`, `Run`, `Kernel`, `Tabs`, `Settings`, `Help`), reported as `preferMenuOpen`;
- an item inside an open menu: the Lumino popup classes (`.lm-Menu`, `.lm-Menu-item`, `.lm-Menu-content`, …), a `role="menu"` container, or any `#jp-mainmenu-*` id together with an item label, reported as `preferClickMenuItem`;
- any other interaction on menu markup — including Lumino's `data-type="submenu"` — reported as the generic `preferMenuHelper`.

Labels are read from `text=`, from `getByText` and from Playwright's text pseudo-classes, so `:has-text("File")`, `:text("File")` and `:text-is("File")` all count. The menu bar classes name the target whatever the label is, so a menu an extension added is covered even though the built-in label list is not.

A `#jp-mainmenu-*` selector matches an open menu at every depth, not the menu bar item that opens it: `#jp-mainmenu-tabs` is the open Tabs menu and `#jp-mainmenu-file-new` is the open File > New submenu.

A locator held in a `const` is followed to its declaration, so `const item = page.locator(...); await item.click();` is read like the inline chain. A `let`, a reassigned name and a parameter are left alone, because the locator the gesture acts on is not known.

### Which menu is open

Lumino gives every menu the same markup. The main menu, the right-click context menu and any dropdown opened from a toolbar button all render as `.lm-Menu` with `role="menu"` content and `role="menuitem"` items, and `page.menu` only walks the main menu. So a selector made only of popup markup is reported only when the main menu was opened first, by a menu bar click or by `page.menu.openLocator` / `page.menu.open` / `page.menu.clickMenuItem` earlier in the same test. A `#jp-mainmenu-*` id names a main menu popup on its own and needs no opener.

`getByRole('menuitem', { name })` is the same case with even less to go on, since the menu bar, the main menu and the context menu all use that role. The opener above it is what makes the item reportable.

A right-click before the item click means the open popup is the context menu, and the rule stays silent. Only the current test is read, and a call to a named helper is not followed into, so one test's menu state never carries into the next.

A bare label has the opposite problem. `page.click('text=File')` is a bare word with no markup at all, and `File`, `Run` and `Help` also name dialog buttons and files. So a selector carrying nothing but a top-level label is reported only when the test is about a menu, in one of two ways: the test title says `menu`, or some string in the test carries real menu markup, from clicking an item in the menu it opened, waiting for the popup, or asserting on it. Only the title takes the bare word; `menu` inside a selector or a file name is not enough.

```ts
await page.click('text=File'); // preferMenuOpen
await page.click('.lm-Menu ul[role="menu"] >> text=New'); // preferClickMenuItem, because the click on the line before opened the main menu

await page.click('.jp-DirListing-item', { button: 'right' });
await page.click('.lm-Menu ul[role="menu"] >> text=Rename'); // not reported: the right-click on the line before opened the context menu

await page.locator('[data-jp-item-name="notifyType"]').click();
await page.locator('.lm-Menu').getByText('Set Default Threshold').click(); // not reported: nothing opened the main menu, so this popup is a toolbar dropdown

await page.getByRole('menuitem', { name: 'File' }).click(); // preferMenuOpen
await page.getByRole('menuitem', { name: 'Open from Path' }).click(); // preferClickMenuItem, because the menu bar click above opened the main menu

await page.click('.jp-Dialog');
await page.getByText('Run').click(); // not reported: nothing in this test is about a menu, so this is a button labelled Run

test('Tabs menu', async ({ page }) => {
  await page.click('text="Tabs"'); // preferMenuOpen: the title says menu, and the test only screenshots the open menu
  await expect(page).toHaveScreenshot('interface_tabs_menu.png');
});
```

## Incorrect

```ts
await page.click('text=File');
await page.click('.lm-Menu ul[role="menu"] >> text=New');
await page.click('#jp-mainmenu-file-new >> text=Terminal');
await page.click('li[role="menuitem"]:has-text("Kernel")');
await page.locator('.lm-MenuBar-item').getByText('File').click();
await page.getByRole('menuitem', { name: 'Settings' }).click();
```

## Correct

```ts
await page.menu.clickMenuItem('File>New>Terminal');
await page.menu.openLocator('File');
await page.menu.closeAll();
```

## Options

This rule has no options.
