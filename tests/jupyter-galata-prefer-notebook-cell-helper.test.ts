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
      // Page *content* is not markup: a cell class name appearing in matched
      // text or in an attribute value proves nothing about the widget
      {
        code: `await page.getByText('jp-Cell').click();`
      },
      {
        code: `await page.click('text=jp-Cell');`
      },
      {
        code: `await page.click('text=".jp-Cell"');`
      },
      {
        code: `await page.getByTestId('jp-Cell').click();`
      },
      {
        code: `await page.locator('[title="jp-Cell"]').click();`
      },
      {
        code: `await page.locator('.jp-Toolbar :has-text("jp-Cell")').click();`
      },
      {
        code: `await page.locator('[aria-label="Code Cell Content"]').fill('x');`
      },
      // The gesture lands on matched text inside the cell, not on the cell
      {
        code: `await page.locator('.jp-Cell').getByText('output').click();`
      },
      {
        code: `await page.click('.jp-Cell >> text=Run');`
      },
      // A pseudo-class argument is a different selector branch, not the target
      {
        code: `await page.locator('.widget:not(.jp-Cell) .cm-content').fill('x');`
      },
      {
        code: `await page.locator('.jp-Notebook:not(:has(.jp-Cell)) .cm-content').fill('x');`
      },
      // A mime renderer or a widget can put an editor in a cell's output
      {
        code: `await page.locator('.jp-Cell .jp-OutputArea-output .cm-content').fill('x');`
      },
      {
        code: `await page.locator('.jp-Cell-outputArea .cm-content').fill('x');`
      },
      {
        code: `await page.locator('.jp-Cell >> .jp-OutputArea >> .cm-editor').click();`
      },
      // Only a primary click selects a cell
      {
        code: `await page.locator('.jp-Cell').click({ button: 'middle' });`
      },
      {
        code: `await page.locator('.jp-Cell').click({ button: btn });`
      },
      {
        code: `await page.locator('.jp-Cell').click({ ...options });`
      },
      // The input prompt only selects a cell when a cell root proves the scope
      {
        code: `await page.locator('.jp-InputArea-prompt').click();`
      },
      {
        code: `await page.locator('.jp-CodeConsole .jp-InputArea-prompt').click();`
      },
      // `selectCells()` cannot reproduce a Control/Meta toggle click
      {
        code: `await page.locator('.jp-Cell .jp-InputArea-prompt').click({ modifiers: ['Control'] });`
      },
      {
        code: `await page.locator('.jp-Cell .jp-InputArea-prompt').click({ modifiers: mods });`
      },
      // A resolved `const` still has to survive every other gate
      {
        code: `const scope = '.jp-CodeConsole';\nawait page.locator(\`\${scope} .jp-Cell .jp-InputArea-prompt\`).click();`
      },
      {
        code: `let scope = '.jp-Cell';\nscope = other;\nawait page.locator(\`\${scope} .jp-InputArea-prompt\`).click();`
      },
      {
        code: `const scope = getSelector();\nawait page.locator(\`\${scope} .jp-Cell\`).click();`
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
      // Stepping over assertions does not reach past a `page.notebook` call
      // (notebook-scroll.test.ts, windowed-notebook.test.ts)
      {
        code: `await page.notebook.runCell(2, true);\nawait expect(thirdCell).not.toBeInViewport({ ratio: 0.2 });\nawait page.keyboard.press('Control+Enter');`
      },
      {
        code: `const output = await page.notebook.getCellTextOutput(0);\nexpect(output).toBe(null);\nawait page.keyboard.press('Control+Enter');`
      },
      // A `page.notebook` call never arms the keyboard gate
      {
        code: `await page.notebook.enterCellEditingMode(0);\nawait page.keyboard.press('Shift+Enter');`
      },
      // A windowed-list row is not proof of a notebook cell: the marker comes
      // from the shared `WindowedList` widget, not from the notebook
      {
        code: `await page.locator('[data-windowed-list-index="0"]').click();`
      },
      {
        code: `await page.locator('[data-windowed-list-indexed]').click();`
      },
      // A union or a sibling combinator puts the cell token in another branch
      {
        code: `await page.locator('.other, .jp-Cell').click();`
      },
      {
        code: `await page.locator('.jp-Cell + .jp-InputArea-editor').click();`
      },
      {
        code: `await page.locator('.jp-Cell ~ .jp-Cell-inputArea').click();`
      },
      // Playwright's other test-id engines match content, not markup
      {
        code: `await page.locator('data-test-id=.jp-Cell').click();`
      },
      {
        code: `await page.locator('data-test=.jp-Cell').click();`
      },
      // A computed or spread option key could be `button`/`modifiers`/`trial`
      {
        code: `await page.locator('.jp-Cell').click({ ['button']: 'right' });`
      },
      {
        code: `await page.locator('.jp-Cell').click({ button: 'left', ['modifiers']: ['Control'] });`
      },
      // `trial` runs the actionability checks without clicking anything
      {
        code: `await page.locator('.jp-Cell').click({ trial: true });`
      },
      // Options the helper cannot reproduce: a triple click selects editor
      // text, `force` skips the checks the helper relies on, and an explicit
      // position aims somewhere other than the gutter `selectCells()` clicks
      {
        code: `await page.locator('.jp-Cell').click({ clickCount: 3 });`
      },
      {
        code: `await page.locator('.jp-Cell').click({ force: true });`
      },
      {
        code: `await page.locator('.jp-Cell').click({ position: { x: 200, y: 40 } });`
      },
      // nbdime rows are not notebook cells, whichever prompt name they use
      {
        code: `await page.locator('.jp-Cell-diff .jp-InputPrompt').click();`
      },
      {
        code: `await page.locator('.jp-Cell-merge .cm-content').fill('x');`
      },
      // Neither is the cell tag editor or the cell toolbar
      {
        code: `await page.locator('.jp-CellTags .jp-InputArea-prompt').click();`
      },
      // A toolbar inside the editor host is not the editor host
      {
        code: `await page.locator('.jp-Cell-inputArea .jp-CodeMirrorEditorToolbar').click();`
      },
      // A reassignable binding could hold a different locator by the time the
      // gesture runs, so only a `const` is followed
      {
        code: `let cell = page.locator('.jp-Cell');\ncell = other;\nawait cell.click();`
      },
      {
        code: `function run(cell) {\n  return cell.click();\n}`
      },
      // A binding that is not a `page` chain stays out of reach, which keeps
      // the `getCellLocator()` idiom silent (notebook-edit.test.ts)
      {
        code: `const cell = await page.notebook.getCellLocator(0);\nawait cell!.locator('.jp-InputArea-prompt').click();`
      },
      {
        code: `const cell = frame.locator('.jp-Cell');\nawait cell.click();`
      },
      // Following the binding does not skip any of the other checks
      {
        code: `const cell = page.locator('.jp-CodeConsole .jp-Cell');\nawait cell.locator('.jp-InputArea-prompt').click();`
      },
      {
        code: `const cell = page.locator(selector);\nawait cell.locator('.jp-InputArea-prompt').click();`
      },
      {
        code: `const cell = page.locator('.jp-Cell');\nawait cell.click({ modifiers: ['Control'] });`
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
        code: `await page.locator("${CELL_EDITOR_CHAIN}").pressSequentially('import math');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      // An explicit left button is still the primary click
      {
        code: `await page.locator('.jp-Cell').click({ button: 'left' });`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // Clicking the input prompt selects the cell: `selectCells()` clicks the
      // same gutter, and shift-clicks for a range (cells-motion.spec.ts)
      {
        code: `await page.locator('.jp-Cell .jp-InputArea-prompt').click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      {
        code: `await page.locator('.jp-Cell .jp-InputArea-prompt').click({ modifiers: ['Shift'] });`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // A selector shared through a `const` is still statically known
      {
        code: `const cellSelector = '[role="main"] >> .jp-NotebookPanel >> .jp-Cell';\nawait page.locator(\`\${cellSelector} >> nth=2 >> .jp-InputArea-prompt\`).click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // `nth=` only filters the preceding segment; the cell is still the target
      {
        code: `await page.click('.jp-Cell >> nth=0');`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      {
        code: `await page.locator('.jp-Cell-inputArea >> nth=0').fill('x');`,
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
      // Content stripped, the surviving markup token still proves a cell
      {
        code: `await page.locator('.jp-Cell:has-text("print")').click();`,
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
      // An assertion between the two does not break the pairing
      {
        code: `await page.locator('.jp-Cell-inputArea').click();\nawait expect(x).toBeVisible();\nawait page.keyboard.press('Shift+Enter');`,
        errors: [
          { messageId: 'preferEnterCellEditingMode' },
          { messageId: 'preferRunCell' }
        ]
      },
      // Any other statement in between does
      {
        code: `await page.locator('.jp-Cell-inputArea').click();\nawait page.waitForTimeout(500);\nawait page.keyboard.press('Shift+Enter');`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      // A conditionally executed interaction does not arm the keyboard gate
      {
        code: `if (hasCell) await page.locator('.jp-Cell-inputArea').click();\nawait page.keyboard.press('Shift+Enter');`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      {
        code: `await page.locator('.jp-Cell-inputArea').click();\nif (run) await page.keyboard.press('Shift+Enter');`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      // A flagged interaction in a *different* block does not carry over
      {
        code: `if (a) {\n  await page.locator('.jp-Cell-inputArea').click();\n}\nawait page.keyboard.press('Shift+Enter');`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      // A `trial: false` click is a real click
      {
        code: `await page.locator('.jp-Cell').click({ trial: false });`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // A cell class still anchors a windowed-list row
      {
        code: `await page.locator('.jp-Cell[data-windowed-list-index="0"]').click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // Two statements sharing a conditional block always run together, so the
      // shortcut really is finishing the flagged interaction
      {
        code: `if (run) {\n  await page.locator('.jp-Cell-inputArea').click();\n  await page.keyboard.press('Shift+Enter');\n}`,
        errors: [
          { messageId: 'preferEnterCellEditingMode' },
          { messageId: 'preferRunCell' }
        ]
      },
      {
        code: `await page.locator("${CELL_EDITOR_CHAIN}").fill('print("hello")');\nawait page.keyboard.press('Control+Enter');`,
        errors: [{ messageId: 'preferSetCell' }, { messageId: 'preferRunCell' }]
      },
      // An assertion between the interaction and the shortcut is stepped over
      // (notebook/ui-tests/test/notebook.spec.ts)
      {
        code: `await page.locator('.jp-Cell .jp-InputArea-prompt').click();\nawait expect(firstCell).toBeFocused();\nawait page.keyboard.press('Shift+Enter');`,
        errors: [
          { messageId: 'preferSelectCells' },
          { messageId: 'preferRunCell' }
        ]
      },
      {
        code: `await page.locator('.jp-Cell-inputArea').click();\nawait expect.soft(cell).toBeVisible();\nexpect(count).toBe(1);\nawait page.keyboard.press('Shift+Enter');`,
        errors: [
          { messageId: 'preferEnterCellEditingMode' },
          { messageId: 'preferRunCell' }
        ]
      },
      // `jp-InputPrompt` and `jp-InputArea-prompt` are the same element
      // (jupyter-chat attachments.spec.ts)
      {
        code: `await page.locator('.jp-Cell >> nth=1 >> .jp-InputPrompt').click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // A waiting option changes nothing about the gesture
      {
        code: `await page.locator('.jp-Cell').click({ timeout: 100 });`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // A cell root and an editor target are enough; naming the input area is
      // not required (jupyter-collaboration notebook.spec.ts)
      {
        code: `await page.locator('.jp-Cell >> .cm-editor').first().click();`,
        errors: [{ messageId: 'preferEnterCellEditingMode' }]
      },
      {
        code: `await page.locator('.jp-Cell .cm-content').fill('a = 1');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      // A locator held in a `const` is the same chain written over two
      // statements (notebook/ui-tests/test/console.spec.ts)
      {
        code: `const cellInput = page.locator("${CELL_EDITOR_CHAIN}").first();\nawait cellInput.fill('a = 1');`,
        errors: [{ messageId: 'preferSetCell' }]
      },
      {
        code: `const cellInput = page.locator("${CELL_EDITOR_CHAIN}").first();\nawait cellInput.press('Shift+Enter');`,
        errors: [{ messageId: 'preferRunCell' }]
      },
      // The binding may carry only part of the chain
      // (notebook/ui-tests/test/notebook.spec.ts)
      {
        code: `const firstCell = page.locator('.jp-Cell').first();\nawait firstCell.locator('.jp-InputArea-prompt').click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // A `!` on the binding does not hide the chain
      {
        code: `const cell = page.locator('.jp-Cell');\nawait cell!.click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // A binding assigned from another binding
      {
        code: `const cell = page.locator('.jp-Cell');\nconst prompt = cell.locator('.jp-InputArea-prompt');\nawait prompt.click();`,
        errors: [{ messageId: 'preferSelectCells' }]
      },
      // The resolved chain arms the keyboard shortcut like an inline one
      {
        code: `const cell = page.locator('.jp-Cell-inputArea');\nawait cell.click();\nawait page.keyboard.press('Shift+Enter');`,
        errors: [
          { messageId: 'preferEnterCellEditingMode' },
          { messageId: 'preferRunCell' }
        ]
      }
    ]
  }
);
