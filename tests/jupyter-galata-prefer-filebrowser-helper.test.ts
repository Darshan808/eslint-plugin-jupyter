/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { RuleTester } from '@typescript-eslint/rule-tester';
import galataPreferFilebrowserHelper from '../src/rules/galata-prefer-filebrowser-helper';

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
  'galata-prefer-filebrowser-helper',
  galataPreferFilebrowserHelper,
  {
    valid: [
      // Galata helper usage is what the rule recommends
      {
        code: `await page.filebrowser.open('data/bar.vl.json');`
      },
      {
        code: `await page.filebrowser.openHomeDirectory();`
      },
      {
        code: `await page.notebook.openByPath('notebooks/Data.ipynb');`
      },
      // Unrelated selectors are not flagged
      {
        code: `await page.click('#submit-button');`
      },
      {
        code: `await page.locator('.jp-Toolbar-item').click();`
      },
      // Template literal without any static file browser marker
      {
        code: `await page.click(\`#\${dynamicId}\`);`
      },
      // Fully dynamic selector cannot be analyzed
      {
        code: `await page.click(selector);`
      },
      // Non-`page` receivers are out of scope
      {
        code: `await popup.click('.jp-DirListing-item');`
      },
      {
        code: `await page.fill('.jp-DirListing-editor', 'text');`
      },
      // Notebook names outside the file browser (tab bar labels, main area
      // tabs) are not file opens
      {
        code: `await page.locator('div.lm-TabBar-tabLabel >> text=Notebook.ipynb').click();`
      },
      {
        code: `await page.click('div[role="main"] >> text=simple_notebook.ipynb', { button: 'right' });`
      },
      // A single click on a bare notebook name is ambiguous (could select a
      // list entry or a tab); only double-clicks open files
      {
        code: `await page.click('text=Data.ipynb');`
      },
      // Right-clicks open the context menu, not the file.
      {
        code: `await page.click(\`.jp-DirListing-item span:has-text("\${testFolderName}")\`, { button: 'right' });`
      },
      {
        code: `await page.locator('.jp-DirListing-item').click({ button: 'right' });`
      },
      // A single click on a file browser item selects it rather than opening it.
      {
        code: `await page.click(\`.jp-DirListing-item span:has-text("\${NOTEBOOK_NAME_1}")\`);`
      },
      {
        code: `await page.locator('.jp-DirListing-item').first().click();`
      },
      // Dots in CSS positions are class selectors, not file names
      {
        code: `await page.dblclick('span.lm-Menu-itemLabel');`
      },
      {
        code: `await page.dblclick('text=Close >> button.jp-Button');`
      },
      // The file selector dialog reuses the directory listing markup, but the
      // `page.filebrowser` helpers only drive the sidebar widget
      {
        code: `await page.locator('.jp-Dialog .jp-DirListing-itemName').first().dblclick();`
      },
      {
        code: `await page.locator('.jp-Dialog').locator('.jp-DirListing-item').dblclick();`
      },
      {
        code: `await page.dblclick('.jp-Dialog >> text=Data.ipynb');`
      }
    ],

    invalid: [
      // A bare name is a directory, which `open()` cannot handle
      {
        code: `await page.dblclick('[aria-label="File Browser Section"] >> text=notebooks');`,
        errors: [{ messageId: 'preferOpenDirectory' }]
      },
      {
        code: `await page.dblclick('.jp-DirListing-item:has-text("mydir")');`,
        errors: [{ messageId: 'preferOpenDirectory' }]
      },
      {
        code: `await page.dblclick('text=Data.ipynb');`,
        errors: [{ messageId: 'preferNotebookOpenByPath' }]
      },
      {
        code: `await page.click('.jp-BreadCrumbs-home svg');`,
        errors: [{ messageId: 'preferOpenHomeDirectory' }]
      },
      // Template literal: static parts still match, but an interpolated name
      // could be either a file or a directory
      {
        code: `await page.dblclick(\`.jp-DirListing-item span:has-text("\${folderName}")\`);`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      {
        code: `await page.dblclick(\`#filebrowser >> text=\${tmpPath}\`);`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      // Locator chain; no name is matched, so the target is unknown
      {
        code: `await page.locator('.jp-DirListing-item').dblclick();`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      // Chained locators: selector parts are combined across the chain
      {
        code: `await page.locator('[aria-label="File Browser Section"]').getByText('notebooks').dblclick();`,
        errors: [{ messageId: 'preferOpenDirectory' }]
      },
      // Dynamic chain segments are ignored, static ones still match
      {
        code: `await page.locator('#filebrowser').getByText(folderName).dblclick();`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      {
        code: `await page.locator('.jp-DirListing-item').getByText('Lorenz.ipynb').dblclick();`,
        errors: [{ messageId: 'preferNotebookOpenByPath' }]
      },
      // Passthrough chain methods (first/last/nth) are followed
      {
        code: `await page.locator('.jp-DirListing-item').first().dblclick();`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      {
        code: `await page.waitForSelector('.jp-DirListing-item[title*="foo"]');`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      // Locator chain + template literal + pattern priority (.ipynb wins)
      {
        code: `await page.locator(\`text=\${name}.ipynb\`).dblclick();`,
        errors: [{ messageId: 'preferNotebookOpenByPath' }]
      },
      {
        code: `await page.getByText('Data.ipynb').dblclick();`,
        errors: [{ messageId: 'preferNotebookOpenByPath' }]
      },
      // Double-clicking any dotted file name in a text match is a file open
      {
        code: `await page.dblclick('text=jupyterlab.md');`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      {
        code: `await page.dblclick('.jp-Content span:has-text("lorenz.py")');`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      // A test driving JupyterLab from a bare Playwright `test` has no
      // helpers on its `page`, and is reported precisely so that the helpers
      // (and the Galata fixture that carries them) get surfaced
      {
        code: `
import { expect, test } from '@playwright/test';
test('benchmark', async ({ page }) => {
  await page.click('#filebrowser >> .jp-BreadCrumbs-home');
  await page.dblclick('[aria-label="File Browser Section"] >> text=notebooks');
  await page.dblclick('text=Data.ipynb');
});`,
        errors: [
          { messageId: 'preferOpenHomeDirectory' },
          { messageId: 'preferOpenDirectory' },
          { messageId: 'preferNotebookOpenByPath' }
        ]
      }
    ]
  }
);
