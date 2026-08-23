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

const CELL_EDITOR_CHAIN =
  '.jp-Cell-inputArea >> .cm-editor >> .cm-content[contenteditable=\\"true\\"]';

ruleTester.run(
  'galata-prefer-notebook-cell-helper',
  galataPreferNotebookCellHelper,
  {
    valid: [
      // The helpers themselves are what the rule recommends
      {
        code: `await page.notebook.setCell(0, 'code', 'print("hello")');`
      },
      {
        code: `await page.notebook.runCell(0);`
      },
      {
        code: `await page.notebook.enterCellEditingMode(0);`
      },
      {
        code: `await page.notebook.addCell('markdown', '## Heading');`
      },
      // Unrelated selectors
      {
        code: `await page.click('#submit-button');`
      },
      {
        code: `await page.locator('.jp-Toolbar-item').click();`
      },
      // Widgets rendered *inside* a cell have no notebook helper
      {
        code: `await page.locator('.jp-Cell-inputCollapser').nth(2).click();`
      },
      {
        code: `await page.locator('.jp-Cell [data-jp-item-name="delete-cell"] jp-button').first().click();`
      },
      {
        code: `await page.locator('.jp-Cell .jp-OutputArea-output a').click();`
      },
      {
        code: `await page.locator('.jp-CellToolbar').click();`
      },
      // No cell root: the file editor and the console use the same editor
      {
        code: `await page.locator('.cm-content').fill('x');`
      },
      {
        code: `await page.locator('.jp-InputArea-editor').click();`
      },
      {
        code: `await page.locator('.jp-FileEditor .cm-content').pressSequentially('markdown cell');`
      },
      // Foreign widgets that reuse cell markup
      {
        code: `await page.locator('.jp-CodeConsole-input >> .cm-editor >> .cm-content[contenteditable="true"]').fill('print(a)');`
      },
      {
        code: `await page.locator('.jp-CodeConsole-promptCell .cm-content').click();`
      },
      {
        code: `await page.locator('.jp-Dialog .jp-Cell-inputArea').click();`
      },
      // Gestures with no notebook helper to recommend
      {
        code: `await page.locator('.jp-Cell').first().hover();`
      },
      {
        code: `await page.waitForSelector('.jp-Cell');`
      },
      // The context menu is a different rule's concern
      {
        code: `await page.locator('.jp-Cell').first().click({ button: 'right' });`
      },
      // Not a run shortcut
      {
        code: `await page.locator('.jp-Cell').first().press('Control+A');`
      },
      // A non-`page` receiver is out of scope
      {
        code: `await popup.locator('.jp-Cell-inputArea').click();`
      },
      // Locators held in variables are out of scope (notebook-edit.test.ts)
      {
        code: `const cell = page.locator('.jp-Cell');\nawait cell.click();`
      },
      // An interpolated selector hides the scope it was written with
      {
        code: 'await page.locator(`.jp-Cell-inputArea >> ${sel}`).click();'
      },
      {
        code: 'await page.locator(`${scope} .jp-Cell`).click();'
      },
      {
        code: `await page.locator(selector).locator('.jp-Cell').click();`
      },
      // A standalone run shortcut is very often deliberate
      // (cells.test.ts 'Run code cell with Ctrl + Enter')
      {
        code: `await page.keyboard.press('Shift+Enter');`
      },
      // Console run shortcut
      {
        code: `await page.keyboard.type('2 + 2');\nawait page.keyboard.press('Shift+Enter');`
      },
      // Deliberately bypassing `runCell`
      {
        code: `await page.notebook.setCell(0, 'code', loopedInput);\nawait page.keyboard.press('Control+Enter');`
      },
      // A `page.notebook` call never arms the keyboard gate
      {
        code: `await page.notebook.enterCellEditingMode(0);\nawait page.keyboard.press('Shift+Enter');`
      }
    ],
    invalid: [
      {
        code: `await page.locator("${CELL_EDITOR_CHAIN}").fill('print("hello")');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      {
        code: `await page.locator("${CELL_EDITOR_CHAIN}").type('import math');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      {
        code: `await page.fill('.jp-Cell >> .jp-InputArea-editor', 'x');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      {
        code: `await page.click('.jp-Cell-inputArea');`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      {
        code: `await page.locator('.jp-Cell .jp-InputArea-editor').first().dblclick();`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      {
        code: `await page.locator('.jp-Cell').nth(2).click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      {
        code: `await page.click('.jp-Notebook-cell:nth-child(1)');`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      {
        code: `await page.locator('.jp-Cell').first().press('Shift+Enter');`,
        errors: [{ messageId: 'preferRunCell' }]
      },
      {
        code: `await page.press('.jp-Cell', 'ControlOrMeta+Enter');`,
        errors: [{ messageId: 'preferRunCell' }]
      },
      // The keyboard gate only arms on the *immediately* preceding statement:
      // one report for the click, none for the shortcut.
      {
        code: `await page.locator('.jp-Cell-inputArea').click();\nawait expect(x).toBeVisible();\nawait page.keyboard.press('Shift+Enter');`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      // A flagged interaction in a *different* block does not carry over
      {
        code: `if (a) {\n  await page.locator('.jp-Cell-inputArea').click();\n}\nawait page.keyboard.press('Shift+Enter');`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      {
        code: `await page.locator("${CELL_EDITOR_CHAIN}").fill('print("hello")');\nawait page.keyboard.press('Control+Enter');`,
        errors: [{ messageId: 'preferSetCell' }, { messageId: 'preferRunCell' }]
      }
    ]
  }
);
