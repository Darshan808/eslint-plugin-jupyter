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
    // `getByRole` chains are not matched at all
    {
      code: `await page.getByRole('menuitem', { name: 'Open in Terminal' }).click();`
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

    // Menu markup without an identifiable item label
    {
      code: `await page.click('span.lm-Menu-itemLabel');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    },
    {
      code: `await page.click('li[role="menuitem"]');`,
      errors: [{ messageId: 'preferMenuHelper' }]
    }
  ]
});
