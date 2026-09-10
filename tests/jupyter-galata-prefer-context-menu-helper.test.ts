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
      // The helpers the rule recommends
      {
        code: `await page.notebook.open('notebook.ipynb', { noKernel: true });`
      },
      {
        code: `await page.filebrowser.open('README.md', 'Markdown Preview');`
      },
      // No context menu opener precedes the flow, so there is no menu open and
      // nothing to rewrite
      {
        code: `
          await page.hover('text=Open With');
          await page.click('text=Editor');
        `
      },
      // Hovering the factory only opens its tooltip/highlight
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.hover('text=Open With');
          await page.hover('text=Notebook (no kernel)');
        `
      },
      // A context menu item that is not reached through `Open With` is a
      // command, not a factory; `openContextMenu` is itself a right-click, so
      // reporting here would only trade one raw gesture for another
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.click('.lm-Menu li[role="menuitem"]:has-text("Rename")');
        `
      },
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.click('text=Open in Terminal');
        `
      },
      // The menu is dismissed before the factory click, so the click lands
      // somewhere else entirely
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.hover('text=Open With');
          await page.keyboard.press('Escape');
          await page.click('text=Editor');
        `
      },
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.hover('text=Open With');
          await page.menu.closeAll();
          await page.click('text=Editor');
        `
      },
      // A `menu.closeAll()` on any receiver dismisses the menu: `this.menu`
      // is how `JupyterLabPage` calls the helper internally
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.hover('text=Open With');
          await this.menu.closeAll();
          await page.click('text=Editor');
        `
      },
      // An `openContextMenu…` method that is not Galata's menu helper proves
      // nothing about which menu, if any, is open
      {
        code: `
          await helpers.openContextMenuForTab('notebook.ipynb');
          await page.hover('text=Open With');
          await page.click('text=Editor');
        `
      },
      // An unrelated click between `Open With` and the factory closes the
      // submenu, so the two are not one flow
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('#jp-main-dock-panel .lm-TabBar-tab');
          await page.click('text=Editor');
        `
      },
      // A multi-file selection opens several documents at once, which neither
      // `filebrowser.open` nor `notebook.open` can do
      {
        code: `
          await page.click('.jp-DirListing-item >> text=a.ipynb');
          await page.keyboard.press('Shift+ArrowDown');
          await page.click('.jp-DirListing-item >> text=b.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Notebook (no kernel)');
        `
      },
      {
        code: `
          await page.click('.jp-DirListing-item >> text=a.ipynb');
          await page.click('.jp-DirListing-item >> text=b.ipynb', { modifiers: ['Shift'] });
          await page.click('.jp-DirListing-item >> text=b.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Editor');
        `
      },
      // Dismissing the menu does not deselect, so the menu opened after it
      // still acts on both files
      {
        code: `
          await page.click('.jp-DirListing-item >> text=a.ipynb');
          await page.keyboard.press('Shift+ArrowDown');
          await page.click('.jp-DirListing-item >> text=b.ipynb', { button: 'right' });
          await page.keyboard.press('Escape');
          await page.click('.jp-DirListing-item >> text=b.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Notebook (no kernel)');
        `
      },
      // A second flow in the same test inherits the selection of the first
      {
        code: `
          await page.click('.jp-DirListing-item >> text=a.ipynb');
          await page.keyboard.press('Shift+ArrowDown');
          await page.click('.jp-DirListing-item >> text=b.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Notebook (no kernel)');
          await page.click('.jp-DirListing-item >> text=b.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Editor');
        `
      },
      // The factory click is raced against `waitForEvent('popup')`, so the test
      // needs the new `Page` the click returns — something the helpers, which
      // resolve to the current page, cannot hand back
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.click('text=Open With');
          const [popup] = await Promise.all([
            page.waitForEvent('popup'),
            page.click('text=Editor')
          ]);
        `
      },
      // Non-\`page\` receivers are out of scope
      {
        code: `
          await this.page.click('.jp-DirListing-item', { button: 'right' });
          await this.page.hover('text=Open With');
          await this.page.click('text=Notebook (no kernel)');
        `
      },
      // Keyboard traversal of the submenu is not the sequence the rule
      // describes, and the item it lands on is unknown
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.keyboard.press('ArrowDown');
          await page.keyboard.press('Enter');
        `
      },
      // The right-click and the submenu traversal live in different test
      // scopes, so the rule cannot see one flow
      {
        code: `
          test.beforeEach(async ({ page }) => {
            await page.click('.jp-DirListing-item', { button: 'right' });
            await page.hover('text=Open With');
          });
          test('opens', async ({ page }) => {
            await page.click('text=Editor');
          });
        `
      },
      // Fully dynamic selectors cannot be analyzed
      {
        code: `
          await page.click(itemSelector, { button: 'right' });
          await page.hover(openWith);
          await page.click(factorySelector);
        `
      }
    ],
    invalid: [
      {
        code: `
          await page.click(\`.jp-DirListing-item span:has-text("\${NOTEBOOK_NAME}")\`, { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Notebook (no kernel)');
          await page.waitForSelector('.jp-NotebookPanel');
        `,
        errors: [{ messageId: 'preferNotebookOpenNoKernel' }]
      },
      // A document factory names `filebrowser.open`'s second argument
      {
        code: `
          await page.click('.jp-DirListing-item >> text=README.md', { button: 'right' });
          await page.click('text=Open With');
          await page.click('.lm-Menu-itemLabel:text("Markdown Preview")');
        `,
        errors: [
          {
            messageId: 'preferFilebrowserOpenFactory',
            data: { factory: 'Markdown Preview' }
          }
        ]
      },
      // `notebook-trust.test.ts` opens a notebook in the plain text editor
      {
        code: `
          await page.click('.jp-DirListing-item >> text=notebook.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Editor');
        `,
        errors: [
          {
            messageId: 'preferFilebrowserOpenFactory',
            data: { factory: 'Editor' }
          }
        ]
      },
      // Locator chains and the `getBy*` spellings are the same gestures
      {
        code: `
          const item = page.locator('.jp-DirListing-item').first();
          await item.click({ button: 'right' });
          await page.getByText('Open With').hover();
          await page.getByRole('menuitem', { name: 'Notebook (no kernel)' }).click();
        `,
        errors: [{ messageId: 'preferNotebookOpenNoKernel' }]
      },
      // `page.menu.openContextMenu` opens the same menu a right-click does, so
      // the submenu traversal after it is still boilerplate
      {
        code: `
          await page.menu.openContextMenu('.jp-DirListing-item >> text=data.csv');
          await page.hover('text=Open With');
          await page.click('text=CSV Viewer');
        `,
        errors: [
          {
            messageId: 'preferFilebrowserOpenFactory',
            data: { factory: 'CSV Viewer' }
          }
        ]
      },
      // Waits interleaved through the flow are exactly the fragile boilerplate
      // the helpers remove; they do not break the sequence
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.waitForSelector('.lm-Menu');
          await page.hover('text=Open With');
          await page.waitForSelector('.lm-Menu .lm-Menu');
          await page.click('text=Editor');
        `,
        errors: [{ messageId: 'preferFilebrowserOpenFactory' }]
      },
      // An unraced click in a new-tab test is a plain factory click
      {
        code: `
          await page.click('.jp-DirListing-item >> text=notebook.ipynb', { button: 'right' });
          await page.click('text=Open With');
          await page.click('text=Editor');
        `,
        errors: [{ messageId: 'preferFilebrowserOpenFactory' }]
      },
      // A dynamic factory label still identifies the flow, but not the
      // argument to suggest
      {
        code: `
          await page.click('.jp-DirListing-item', { button: 'right' });
          await page.click('text=Open With');
          await page.click(\`.lm-Menu-itemLabel >> text=\${factory}\`);
        `,
        errors: [{ messageId: 'preferFilebrowserOpen' }]
      },
      // Two flows in one test are two reports
      {
        code: `
          await page.click('text=a.md', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Markdown Preview');
          await page.click('text=b.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Notebook (no kernel)');
        `,
        errors: [
          { messageId: 'preferFilebrowserOpenFactory' },
          { messageId: 'preferNotebookOpenNoKernel' }
        ]
      },
      // A selection collapsed back to a single file before the right-click is
      // a single-document flow again
      {
        code: `
          await page.click('.jp-DirListing-item >> text=a.ipynb');
          await page.keyboard.press('Shift+ArrowDown');
          await page.click('.jp-DirListing-item >> text=b.ipynb');
          await page.click('.jp-DirListing-item >> text=b.ipynb', { button: 'right' });
          await page.hover('text=Open With');
          await page.click('text=Notebook (no kernel)');
        `,
        errors: [{ messageId: 'preferNotebookOpenNoKernel' }]
      }
    ]
  }
);
