/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import galataPreferMenuHelper from '../src/rules/galata-prefer-menu-helper';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run('galata-prefer-menu-helper', galataPreferMenuHelper, {
  valid: [
    // Galata helper usage is what the rule recommends
    {
      code: `await page.menu.clickMenuItem('File>New>Terminal');`
    },
    // Unrelated selectors are not flagged
    {
      code: `await page.click('#submit-button');`
    },
    // Non-`page` receivers are out of scope
    {
      code: `await popup.click('text=File');`
    },
    // Fully dynamic selector cannot be analyzed
    {
      code: `await page.click(selector);`
    },
    // A lowercase `-menu` suffix is a different widget (debugger toolbar
    // dropdown), not Lumino menu markup
    {
      code: `await page.click('.jp-PauseOnExceptions-menu >> text=Continue');`
    },
    // `getByRole('menuitem', { name })` carries no scope: this is just as likely
    // a context menu item, so only exact top-level labels or a popup container
    // in the same chain are reported
    {
      code: `await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();`
    },
    {
      code: `await page.getByRole('menuitem', { name: 'Open from Path' }).click();`
    },
    // A non-menu role with a menu-shaped name is not a menu
    {
      code: `await page.getByRole('button', { name: 'File' }).click();`
    },
    // A dynamic role must not leak a bare `text=File` that looks unscoped
    {
      code: `await page.getByRole(role, { name: 'File' }).click();`
    },
    {
      code: `await page.getByRole('menuitem', { name: someVar }).click();`
    },
    // `data-command` is not menu evidence: Lumino's CommandPalette renderer
    // emits it too, and JupyterLab/JupyterLite put it on toolbar buttons
    {
      code: `await page.click('jp-button[data-command="running:show-modal"]');`
    },
    {
      code: `await page.click('[data-command="notebook:create-new"] >> text="Python 3"');`
    },
    // Right-clicks open the context menu, not the main menu
    {
      code: `await page.click('text=File', { button: 'right' });`
    },
    // Waiting is not an interaction
    {
      code: `await page.waitForSelector('.lm-Menu-content');`
    },
    {
      code: `await page.locator('#jp-mainmenu-tabs').waitFor();`
    },
    // Only `click` drives a Lumino menu, and `page.menu` has no equivalent for
    // any other gesture, so the rest are ignored even on menu markup
    {
      code: `await page.dblclick('span.lm-Menu-itemLabel');`
    },
    {
      code: `await page.hover('.lm-Menu ul[role="menu"] >> text=New File');`
    },
    // A label that merely contains a top-level menu name is not the menu bar
    {
      code: `await page.click('text=New File');`
    },
    // A top-level label scoped by something that is NOT menu markup means the
    // label is a different piece of UI: a file named `File`, a button named
    // `Run`. These must never be flagged.
    {
      code: 'await page.dblclick(`#filebrowser >> text="File"`);'
    },
    {
      code: `await page.click('#filebrowser >> text="File"');`
    },
    {
      code: `await page.locator('#filebrowser').getByText('File').click();`
    },
    {
      code: `await page.click('button:has-text("Run")');`
    },
    // Anchored on the right: trailing selector parts are not a bare label
    {
      code: `await page.click('text=File >> nth=0');`
    },
    // A popup opened by an earlier right-click is the context menu, which
    // `page.menu.clickMenuItem` does not drive. The right-click need not be the
    // immediately preceding statement.
    {
      code: `
        await page.click('.jp-DirListing-item', { button: 'right' });
        await page.hover('text=Open With');
        await page.click('.lm-Menu li[role="menuitem"]:has-text("Editor")');
      `
    },
    // Same, via the Galata context menu helper
    {
      code: `
        const contextMenu = await page.menu.openContextMenuLocator('.jp-DirListing-content');
        await page.click('text=Open With');
        await page.click('.lm-Menu-itemLabel >> text=Notebook');
      `
    },
    // Menu markup with no item label, inside a context menu
    {
      code: `
        await page.click('.jp-DirListing-item', { button: 'right' });
        await page.click('span.lm-Menu-itemLabel');
      `
    },
    // The lookback reaches out of a nested block
    {
      code: `
        await page.click('.jp-DirListing-item', { button: 'right' });
        if (shouldOpen) {
          await page.click('.lm-Menu ul[role="menu"] >> text=Editor');
        }
      `
    },
    // A right-click on a locator held in a variable opens the context menu just
    // as an inline one does
    {
      code: `
        const folder = page.locator('.jp-DirListing-item');
        await folder.click({ button: 'right' });
        await page.click('.lm-Menu ul[role="menu"] >> text=Open in Terminal');
      `
    },
    // …and so does one through a helper root the selector matcher cannot follow
    {
      code: `
        await page.activity.getTabLocator('Console 1').click({ button: 'right' });
        await page.click('.lm-Menu li[role="menuitem"]:has-text("Rename")');
      `
    },
    // A Lumino menu opened from a toolbar button is neither the main menu nor
    // the context menu, and no `page.menu` call reaches it
    {
      code: `
        await page.locator('[data-jp-item-name="notifyType"]').click();
        await page.locator('.lm-Menu').locator('.lm-Menu-item:has-text("Set Default Threshold")').click();
      `
    },
    {
      code: `await page.click('.jp-PauseOnExceptions-menu li div.lm-Menu-itemLabel:text("raised")');`
    },
    // Popup markup with nothing before it to say which menu is open
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=New');`
    },
    // One test's menu state does not reach the next
    {
      code: `
        test('a', async ({ page }) => {
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.click('.lm-Menu ul[role="menu"] >> text=Rename');
        });
        test('b', async ({ page }) => {
          await page.click('.lm-Menu ul[role="menu"] >> text=Close Tab');
        });
      `
    },
    // A named helper can be called from anywhere, so its right-click says
    // nothing about the statements next to the call
    {
      code: `
        async function openContext(page) {
          await page.click('.jp-DirListing-item', { button: 'right' });
        }
        await page.click('.lm-Menu ul[role="menu"] >> text=New');
      `
    },
    // A bare top-level label is just a word. `File`, `Run` and `Help` name
    // dialog buttons and files too, so a test that never mentions menu markup
    // is not walking the menu bar.
    {
      code: `
        test('run from a dialog', async ({ page }) => {
          await page.click('.jp-Dialog');
          await page.getByText('Run').click();
        });
      `
    },
    {
      code: `
        test('open the settings editor', async ({ page }) => {
          await page.click('text=Settings');
          await expect(page.locator('.jp-SettingsPanel')).toBeVisible();
        });
      `
    }
  ],

  invalid: [
    // A bare top-level menu bar label, unquoted and quoted. The label alone is
    // just a word, so each needs the test to mention menu markup somewhere;
    // clicking an item in the menu it opened is the usual way.
    {
      code: `
        await page.click('text=File');
        await page.click('.lm-Menu ul[role="menu"] >> text=New');
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferClickMenuItem' }
      ]
    },
    // Waiting for the popup counts as the mention, no interaction needed
    {
      code: `
        await page.click('text="Tabs"');
        await page.locator('#jp-mainmenu-tabs').waitFor();
      `,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // …and so does an assertion on it
    {
      code: `
        await page.click('text=Kernel');
        await expect(page.locator('.lm-Menu-content')).toBeVisible();
      `,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // A test title naming the menu counts too. This one screenshots the open
    // menu without ever selecting it, which is the `documentation` shape.
    {
      code: `
        test('Tabs menu', async ({ page }) => {
          await page.click('text="Tabs"');
          await expect(page).toHaveScreenshot('interface_tabs_menu.png');
        });
      `,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // A scoped top-level label IS trusted when the scope is menu markup.
    // `role="menuitem"` alone does not prove a popup: menu bar items carry it
    // too, so these stay `preferMenuOpen`.
    {
      code: `await page.click('li[role="menuitem"]:has-text("Kernel")');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('.lm-MenuBar-item >> text=File');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // Locator chain: parts are joined with a space, not `>>`
    {
      code: `await page.locator('.lm-MenuBar-item').getByText('File').click();`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // Every `#jp-mainmenu-…` id names a popup, never the menu bar `li`, so a
    // click on the id alone lands on the open menu and there is no path to
    // suggest. The nesting depth of the id changes nothing.
    {
      code: `await page.click('#jp-mainmenu-tabs');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('#jp-mainmenu-tabs >> text=Lorenz.ipynb');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Chain form of a bare top-level label
    {
      code: `
        await page.getByText('File').click();
        await page.click('.lm-Menu ul[role="menu"] >> text=New');
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferClickMenuItem' }
      ]
    },
    // `getByRole('menuitem', { name })` on an exact top-level label is the
    // dominant menu bar idiom in the Notebook and JupyterLite UI tests
    {
      code: `await page.getByRole('menuitem', { name: 'File' }).click();`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.getByRole('menuitem', { name: 'Settings' }).click();`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },

    // Item clicks inside an open popup menu. Popup markup is shared with the
    // context menu and with every toolbar dropdown, so each of these needs the
    // menu bar click that opened the main menu.
    //
    // Template literal: static parts still match
    {
      code:
        'await page.click(`text=Settings`);\n' +
        'await page.click(`.lm-Menu ul[role="menu"] >> text="${menuOption}"`);',
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferClickMenuItem' }
      ]
    },
    // A `#jp-mainmenu-…` id names a main menu popup, so it needs no opener
    {
      code: `await page.click('#jp-mainmenu-file-new >> text=Terminal');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // A popup container wins over the top-level label shape
    {
      code: `
        await page.click('text=File');
        await page.click('.lm-Menu li[role="menuitem"]:has-text("File")');
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferClickMenuItem' }
      ]
    },
    // A popup container scoping a `getByRole` item is enough evidence
    {
      code: `
        await page.menu.open('View');
        await page.locator('.lm-Menu').getByRole('menuitem', { name: 'Editor' }).click();
      `,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },

    // Menu markup without an identifiable item label
    {
      code: `
        await page.click('text=File');
        await page.click('span.lm-Menu-itemLabel');
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    {
      code: `
        await page.menu.open('Edit');
        await page.click('li[role="menuitem"]');
      `,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    // `data-type="submenu"` is stamped by Lumino on any submenu-opening item
    {
      code: `
        await page.getByRole('menuitem', { name: 'Settings' }).click();
        await page.locator('li[data-type=submenu]', { hasText: /^Theme$/ }).click();
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferMenuHelper' }
      ]
    },
    // A locator held in a `const` reaches the same `page` root as the inline
    // chain
    {
      code: `
        const menuBar = page.locator('.lm-MenuBar-item');
        await menuBar.getByText('File').click();
      `,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `
        await page.click('text=File');
        const newItem = page.locator('.lm-Menu ul[role="menu"]').getByText('New');
        await newItem.click();
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferClickMenuItem' }
      ]
    },
    // A callback that runs where it is written keeps the menu its caller opened
    {
      code: `
        await page.click('text=File');
        await perf.measure(async () => {
          await page.click('.lm-Menu ul[role="menu"] >> text=Close Tab');
        });
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferClickMenuItem' }
      ]
    },

    // A menu bar click after an unrelated right-click re-opens the main menu,
    // so the popup items below it are main menu items again. This is the
    // `documentation/general.test.ts` shape.
    {
      code: `
        await page.click('text=README.md', { button: 'right' });
        await page.click('text=Open With');
        await page.click('text=Markdown Preview');
        await page.click('text=File');
        await page.click('.lm-Menu ul[role="menu"] >> text=New');
      `,
      errors: [
        { messageId: 'preferMenuOpen' },
        { messageId: 'preferClickMenuItem' }
      ]
    },
    // `#jp-mainmenu-…` is main menu evidence on its own: no context menu
    // carries that id, so the lookback never applies.
    {
      code: `
        await page.click('.jp-DirListing-item', { button: 'right' });
        await page.click('#jp-mainmenu-file-new >> text=Terminal');
      `,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // `page.menu.open` re-opens the main menu just as a menu bar click does
    {
      code: `
        await page.click('.jp-DirListing-item', { button: 'right' });
        await page.menu.open('Settings');
        await page.click('.lm-Menu ul[role="menu"] >> text=Theme');
      `,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // …and so does `openLocator`, the spelling the messages recommend
    {
      code: `
        await page.click('.jp-DirListing-item', { button: 'right' });
        await page.menu.openLocator('Settings');
        await page.click('.lm-Menu ul[role="menu"] >> text=Theme');
      `,
      errors: [{ messageId: 'preferClickMenuItem' }]
    }
  ]
});
