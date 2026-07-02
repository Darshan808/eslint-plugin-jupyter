/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  extractStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds =
  | 'preferNotebookOpenByPath'
  | 'preferOpenHomeDirectory'
  | 'preferFilebrowserHelper';
type Options = [];

interface SelectorPattern {
  test: RegExp;
  messageId: MessageIds;
}

// Ordered: more specific patterns first, first match wins.
const PATTERNS: SelectorPattern[] = [
  { test: /\.ipynb\b/, messageId: 'preferNotebookOpenByPath' },
  { test: /jp-BreadCrumbs/, messageId: 'preferOpenHomeDirectory' },
  {
    test: /File Browser Section|jp-DirListing/,
    messageId: 'preferFilebrowserHelper'
  }
];

const galataPreferFilebrowserHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-filebrowser-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Galata filebrowser and notebook helpers over raw Playwright selectors for JupyterLab file browser interactions'
    },
    messages: {
      preferNotebookOpenByPath:
        'Prefer `page.notebook.openByPath(path)` (or `page.notebook.open(name)`) over raw selectors to open a notebook. The helper traverses directories, waits for the tab to become visible, and does not depend on the file browser DOM.',
      preferOpenHomeDirectory:
        'Prefer `page.filebrowser.openHomeDirectory()` over clicking the breadcrumbs (`.jp-BreadCrumbs`) directly. The helper waits for the file browser to refresh.',
      preferFilebrowserHelper:
        'Prefer the Galata `page.filebrowser` helper (e.g. `page.filebrowser.open(path)`) over raw file browser selectors. Helpers handle nested directories and built-in waits; raw selectors break when the DOM or labels change.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        const match = matchSelectorInteraction(node);
        if (!match) {
          return;
        }

        const selectorText = extractStaticSelectorText(match.selectorArgNode);
        if (selectorText === null) {
          return;
        }

        for (const pattern of PATTERNS) {
          if (pattern.test.test(selectorText)) {
            context.report({
              node: match.callNode,
              messageId: pattern.messageId
            });
            return;
          }
        }
      }
    };
  }
});

export = galataPreferFilebrowserHelper;
