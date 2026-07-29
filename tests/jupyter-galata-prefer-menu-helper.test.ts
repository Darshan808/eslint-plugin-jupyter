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
      code: `await page.menu.open('File');`
    },
    {
      code: `await page.menu.clickMenuItem('File>New>Terminal');`
    },
    {
      code: `await page.menu.openContextMenu('.jp-DirListing-item');`
    },
    // Unrelated selectors are not flagged
    {
      code: `await page.click('#submit-button');`
    },
    {
      code: `await page.locator('.jp-Toolbar-item').click();`
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
    // Context menu items are owned by a separate rule; `getByRole` chains are
    // not matched at all
    {
      code: `await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();`
    },
    // Right-clicks open the context menu, not the main menu
    {
      code: `await page.click('text=File', { button: 'right' });`
    },
    {
      code: `await page.click('li[role="menuitem"]:has-text("File")', { button: 'right' });`
    },
    // Waiting and asserting are not interactions
    {
      code: `await page.locator('#jp-mainmenu-tabs').waitFor();`
    },
    {
      code: `await page.locator('.lm-Menu-content').waitFor();`
    },
    {
      code: `expect(page.locator('.lm-Menu:visible')).toBeVisible();`
    },
    // Form-control interactions and explicit waits are out of scope for menus
    {
      code: `await page.waitForSelector('.lm-Menu-content');`
    },
    {
      code: `await page.fill('.lm-Menu-content', 'x');`
    },
    // A label that merely starts with a top-level menu name is not the menu bar
    {
      code: `await page.click('text=New File');`
    }
  ],

  invalid: [
    // Bare top-level menu bar labels
    {
      code: `await page.click('text=File');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('text=Settings');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('text=Tabs');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // `role="menuitem"` alone does not prove a popup: menu bar items carry it too
    {
      code: `await page.click('li[role="menuitem"]:has-text("Kernel")');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('li[role="menuitem"]:has-text("File")');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // A single-segment menu bar item id
    {
      code: `await page.click('#jp-mainmenu-tabs');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    // Locator chain form of a bare top-level label
    {
      code: `await page.getByText('File').click();`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },

    // Item clicks inside an open popup menu
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=New');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=Language');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=Theme');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=Close Tab');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Template literal: static parts still match
    {
      code: 'await page.click(`.lm-Menu ul[role="menu"] >> text="${menuOption}"`);',
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Hover switches the open submenu
    {
      code: `await page.hover('ul[role="menu"] >> text=New File');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.hover('.lm-Menu ul[role="menu"] >> text=Text File');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Submenu ids
    {
      code: `await page.click('#jp-mainmenu-file-new >> text=Terminal');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.click('#jp-mainmenu-file-new >> text=Console');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.click('#jp-mainmenu-settings-language >> text=Chinese');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // A popup container wins over the item label shape
    {
      code: `await page.click('.lm-Menu li[role="menuitem"]:has-text("Editor")');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Chained locators: text locators are normalized to the `text=` form
    {
      code: `await page.locator('.lm-Menu').getByText('New').click();`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },

    // Menu markup without an identifiable item label
    {
      code: `await page.dblclick('span.lm-Menu-itemLabel');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.hover('.lm-MenuBar');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('li[role="menuitem"]');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    }
  ]
});
