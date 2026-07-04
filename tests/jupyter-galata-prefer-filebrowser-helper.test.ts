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
      }
    ],

    invalid: [
      {
        code: `await page.dblclick('[aria-label="File Browser Section"] >> text=notebooks');`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      {
        code: `await page.dblclick('text=Data.ipynb');`,
        errors: [{ messageId: 'preferNotebookOpenByPath' }]
      },
      {
        code: `await page.click('.jp-BreadCrumbs-home svg');`,
        errors: [{ messageId: 'preferOpenHomeDirectory' }]
      },
      // Template literal: static parts still match
      {
        code: `await page.click(\`.jp-DirListing-item span:has-text("\${fileName}")\`, { button: 'right' });`,
        errors: [{ messageId: 'preferFilebrowserHelper' }]
      },
      // Locator chain
      {
        code: `await page.locator('.jp-DirListing-item').dblclick();`,
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
      }
    ]
  }
);
