/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import galataPreferNotebookCellHelper from '../src/rules/galata-prefer-notebook-cell-helper';

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
  'galata-prefer-notebook-cell-helper',
  galataPreferNotebookCellHelper,
  {
    valid: [
      // Galata helper usage is what the rule recommends
      {
        code: `await page.notebook.setCell(0, 'code', 'print("hello")');`
      },
      {
        code: `await page.notebook.runCell(0);`
      },
      {
        code: `await page.notebook.runCellByCell();`
      },
      // Other keyboard shortcuts are not run-cell shortcuts
      {
        code: `await page.keyboard.press('Escape');`
      },
      {
        code: `await page.keyboard.press('Control+S');`
      },
      // Dynamic key cannot be analyzed
      {
        code: `await page.keyboard.press(shortcut);`
      },
      // Unrelated selectors are not flagged
      {
        code: `await page.click('.jp-Toolbar-item');`
      },
      // A bare CodeMirror selector is not notebook-specific (file editor, console)
      {
        code: `await page.fill('.cm-content', 'text');`
      },
      // Non-`page` receivers are out of scope
      {
        code: `await keyboard.press('Control+Enter');`
      },
      {
        code: `await popup.click('.jp-Cell-inputArea');`
      }
    ],

    invalid: [
      // Filling the cell editor directly
      {
        code: `await page.locator('.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable="true"]').fill('print("hello")');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      {
        code: `await page.fill('.jp-InputArea-editor', 'x = 1');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      // Template literal: static parts still match
      {
        code: `await page.fill(\`.jp-Cell[data-index="\${index}"] .jp-InputArea-editor\`, code);`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      // Run-cell keyboard shortcuts
      {
        code: `await page.keyboard.press('Control+Enter');`,
        errors: [{ messageId: 'preferRunCell' }]
      },
      {
        code: `await page.keyboard.press('Shift+Enter');`,
        errors: [{ messageId: 'preferRunCell' }]
      },
      // Other interactions with the cell DOM
      {
        code: `await page.click('.jp-Cell-inputArea');`,
        errors: [{ messageId: 'preferCellHelper' }]
      },
      {
        code: `await page.locator('.jp-Notebook-cell').dblclick();`,
        errors: [{ messageId: 'preferCellHelper' }]
      },
      {
        code: `await page.waitForSelector('.jp-Cell-outputArea');`,
        errors: [{ messageId: 'preferCellHelper' }]
      }
    ]
  }
);
