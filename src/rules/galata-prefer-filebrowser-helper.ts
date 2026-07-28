/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  combineStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds =
  | 'preferNotebookOpenByPath'
  | 'preferOpenHomeDirectory'
  | 'preferFilebrowserHelper';
type Options = [];

const NOTEBOOK_FILE_PATTERN = /\.ipynb\b/;
const BREADCRUMBS_PATTERN = /jp-BreadCrumbs-home/;
// Selectors scoped to the file browser region
const FILEBROWSER_CONTEXT_PATTERN =
  /File Browser Section|jp-DirListing-item|#filebrowser\b/;
// A dotted file name inside a text match: `text=lorenz.py`,
// `:has-text("bar.vl.json")`. The dot must sit between word
// characters and only inside the text portion (which ends at `>>`), so CSS
// selectors like `span.lm-Menu-itemLabel` or `text=Close >> button.jp-Button`
// are not mistaken for file names.
const FILE_TEXT_PATTERN = /(?:text=|has-text\()["']?[^>"')]*\w\.\w/;

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

        // Right-clicks open the context menu
        if (match.isRightClick) {
          return;
        }

        const selectorText = combineStaticSelectorText(match);
        if (selectorText === null) {
          return;
        }

        // Double-clicking is the open gesture.
        const opensTarget = match.interactionMethod === 'dblclick';

        if (opensTarget && NOTEBOOK_FILE_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId: 'preferNotebookOpenByPath'
          });
          return;
        }

        if (BREADCRUMBS_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId: 'preferOpenHomeDirectory'
          });
          return;
        }

        // Double-clicked file browser items and file names are opens; a
        // waitForSelector on the file browser has helper waits instead.
        if (
          (opensTarget &&
            (FILEBROWSER_CONTEXT_PATTERN.test(selectorText) ||
              FILE_TEXT_PATTERN.test(selectorText))) ||
          (match.interactionMethod === 'waitForSelector' &&
            FILEBROWSER_CONTEXT_PATTERN.test(selectorText))
        ) {
          context.report({
            node: match.callNode,
            messageId: 'preferFilebrowserHelper'
          });
        }
      }
    };
  }
});

export = galataPreferFilebrowserHelper;
