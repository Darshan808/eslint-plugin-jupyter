/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import galataPreferContextMenuHelper from '../src/rules/galata-prefer-context-menu-helper';

const ruleTester = new RuleTester({
  languageOptions: {
    parser: require('@typescript-eslint/parser'),
    parserOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    }
  }
});

ruleTester.run(
  'galata-prefer-context-menu-helper',
  galataPreferContextMenuHelper,
  {
    valid: [
      // Galata helper usage is what the rule recommends
      {
        code: `await page.notebook.open('Data.ipynb', { noKernel: true });`
      },
      {
        code: `await page.filebrowser.open('README.md', 'Markdown Preview');`
      },
      // Left-clicks on file browser items are galata-prefer-filebrowser-helper's domain
      {
        code: `await page.click('.jp-DirListing-item');`
      },
      // Right-clicks outside the file browser are out of scope
      {
        code: `await page.click('.jp-Notebook-cell', { button: 'right' });`
      },
      // 'Open With' only matches as whole words
      {
        code: `await page.click('text=Open Withdrawal Form');`
      },
      // Fully dynamic selector cannot be analyzed
      {
        code: `await page.click(itemSelector, { button: 'right' });`
      },
      // Non-`page` receivers are out of scope
      {
        code: `await popup.click('.jp-DirListing-item', { button: 'right' });`
      }
    ],

    invalid: [
      {
        code: `await page.click('.jp-DirListing-item span:has-text("Data.ipynb")', { button: 'right' });`,
        errors: [{ messageId: 'preferHelperOverContextMenu' }]
      },
      // Template literal: static parts still match
      {
        code: `await page.click(\`.jp-DirListing-item span:has-text("\${NOTEBOOK_NAME}")\`, { button: 'right' });`,
        errors: [{ messageId: 'preferHelperOverContextMenu' }]
      },
      // Locator chain: options live on the interaction call
      {
        code: `await page.locator('.jp-DirListing-item').click({ button: 'right' });`,
        errors: [{ messageId: 'preferHelperOverContextMenu' }]
      },
      {
        code: `await page.hover('text=Open With');`,
        errors: [{ messageId: 'preferOpenWithFactory' }]
      },
      {
        code: `await page.click('.lm-Menu li:has-text("Open With")');`,
        errors: [{ messageId: 'preferOpenWithFactory' }]
      },
      {
        code: `await page.click('text=Notebook (no kernel)');`,
        errors: [{ messageId: 'preferNoKernelOption' }]
      },
      {
        code: `await page.getByText('Editor (no kernel)').click();`,
        errors: [{ messageId: 'preferNoKernelOption' }]
      }
    ]
  }
);
