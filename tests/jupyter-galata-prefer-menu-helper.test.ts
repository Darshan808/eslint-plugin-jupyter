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
    {
      code: `await page.menu.open('File');`
    },
    {
      code: `await page.menu.closeAll();`
    },
    // Top-level labels only match exactly
    {
      code: `await page.click('text=File Browser');`
    },
    {
      code: `await page.click('text=Run All Cells');`
    },
    // Unrelated selectors are not flagged
    {
      code: `await page.click('#submit-button');`
    },
    // Fully dynamic selector cannot be analyzed
    {
      code: `await page.click(menuSelector);`
    },
    // Non-`page` receivers are out of scope
    {
      code: `await popup.click('text=File');`
    }
  ],

  invalid: [
    {
      code: `await page.click('text=File');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('text=Settings');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('.lm-MenuBar-item:has-text("Help")');`,
      errors: [{ messageId: 'preferMenuOpen' }]
    },
    {
      code: `await page.click('.lm-Menu ul[role="menu"] >> text=New');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.click('#jp-mainmenu-file-new >> text=Terminal');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Hovering menu items is just as brittle as clicking them
    {
      code: `await page.hover('.lm-Menu >> text=Open With');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Locator chain
    {
      code: `await page.locator('ul[role="menu"] >> text=Close Tab').click();`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    // Template literal: static parts still match
    {
      code: `await page.click(\`#jp-mainmenu-\${menuName}\`);`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    },
    {
      code: `await page.waitForSelector('li[role="menuitem"]:has-text("Export")');`,
      errors: [{ messageId: 'preferClickMenuItem' }]
    }
  ]
});
