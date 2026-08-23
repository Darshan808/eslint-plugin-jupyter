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
    }
  ],

  invalid: [
    // A bare top-level menu bar label, unquoted and quoted
    {
      code: `await page.click('text=File');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('text="Tabs"');`,
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
    // A single-segment menu bar item id
    {
      code: `await page.click('#jp-mainmenu-tabs');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // Chain form of a bare top-level label
    {
      code: `await page.getByText('File').click();`,
      errors: [{ messageId: 'preferMenuOpen' }]
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

    // Item clicks inside an open popup menu
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=New');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Template literal: static parts still match
    {
      code: 'await page.click(`.lm-Menu ul[role="menu"] >> text="${menuOption}"`);',
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // A submenu id is multi-segment, unlike a menu bar item id
    {
      code: `await page.click('#jp-mainmenu-file-new >> text=Terminal');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // A popup container wins over the top-level label shape
    {
      code: `await page.click('.lm-Menu li[role="menuitem"]:has-text("File")');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // A popup container scoping a `getByRole` item is enough evidence
    {
      code: `await page.locator('.lm-Menu').getByRole('menuitem', { name: 'Editor' }).click();`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },

    // Menu markup without an identifiable item label
    {
      code: `await page.click('span.lm-Menu-itemLabel');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('li[role="menuitem"]');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    // `data-type="submenu"` is stamped by Lumino on any submenu-opening item
    {
      code: `await page.locator('li[data-type=submenu]', { hasText: /^Theme$/ }).click();`,
      errors: [{ messageId: 'preferMenuHelper' }]
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
    }
  ]
});
