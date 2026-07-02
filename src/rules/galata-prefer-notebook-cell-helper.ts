/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  extractStaticSelectorText,
  matchPageNestedCall,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds = 'preferSetCell' | 'preferRunCell' | 'preferCellHelper';
type Options = [];

// Notebook cell DOM, e.g. '.jp-Cell-inputArea >> .cm-editor'
const CELL_SELECTOR_PATTERN = /jp-Cell|jp-InputArea|jp-Notebook-cell/;
// Keyboard shortcuts that run the active cell
const RUN_SHORTCUT_PATTERN = /^(Control|Ctrl|Shift|Meta|Cmd)\+Enter$/;

const galataPreferNotebookCellHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-notebook-cell-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Galata notebook cell helpers over raw Playwright selectors and keyboard shortcuts to set, select, or run notebook cells'
    },
    messages: {
      preferSetCell:
        'Prefer `page.notebook.setCell(index, type, source)` over filling the cell editor DOM directly. The helper handles cell selection, editing mode, and content updates without depending on the editor DOM structure.',
      preferRunCell:
        'Prefer `page.notebook.runCell(index)` (or `runCellByCell()`) over pressing Control+Enter / Shift+Enter to run a cell. The helper resets execution counters and waits until the kernel can schedule execution; raw shortcuts cause timing failures.',
      preferCellHelper:
        'Prefer Galata notebook cell helpers (e.g. `page.notebook.selectCells(index)`, `page.notebook.enterCellEditingMode(index)`, `page.notebook.getCellOutput(index)`) over raw cell DOM selectors (`.jp-Cell*`). Raw selectors depend on the notebook DOM structure and skip readiness checks.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        // page.keyboard.press('Control+Enter')
        const keyNode = matchPageNestedCall(node, ['keyboard', 'press']);
        if (keyNode) {
          const key = extractStaticSelectorText(keyNode);
          if (key !== null && RUN_SHORTCUT_PATTERN.test(key)) {
            context.report({ node, messageId: 'preferRunCell' });
          }
          return;
        }

        const match = matchSelectorInteraction(node);
        if (!match) {
          return;
        }

        const selectorText = extractStaticSelectorText(match.selectorArgNode);
        if (selectorText === null) {
          return;
        }

        if (CELL_SELECTOR_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId:
              match.interactionMethod === 'fill'
                ? 'preferSetCell'
                : 'preferCellHelper'
          });
        }
      }
    };
  }
});

export = galataPreferNotebookCellHelper;
