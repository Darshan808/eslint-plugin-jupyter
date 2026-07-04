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
  { test: /jp-BreadCrumbs-home/, messageId: 'preferOpenHomeDirectory' },
  {
    test: /File Browser Section|jp-DirListing-item|#filebrowser\b/,
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
        'Prefer `page.notebook.openByPath(path)` (or `page.notebook.open(name)`) over raw selectors to open a notebook.',
      preferOpenHomeDirectory:
        'Prefer `page.filebrowser.openHomeDirectory()` over clicking the home breadcrumb (`.jp-BreadCrumbs-home`) directly.',
      preferFilebrowserHelper:
        'Prefer the Galata `page.filebrowser` helper (e.g. `page.filebrowser.open(path)`) over raw file browser selectors.'
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
