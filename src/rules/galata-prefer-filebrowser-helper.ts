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

const NOTEBOOK_FILE_PATTERN = /\.ipynb\b/;
const BREADCRUMBS_PATTERN = /jp-BreadCrumbs-home/;
// Selectors scoped to the file browser region
const FILEBROWSER_CONTEXT_PATTERN =
  /File Browser Section|jp-DirListing-item|#filebrowser\b/;

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

        const staticParts = match.selectorArgNodes
          .map(extractStaticSelectorText)
          .filter((text): text is string => text !== null);
        if (staticParts.length === 0) {
          return;
        }
        const selectorText = staticParts.join(' ');

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

        if (
          FILEBROWSER_CONTEXT_PATTERN.test(selectorText) &&
          (opensTarget || match.interactionMethod === 'waitForSelector')
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
