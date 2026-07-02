/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  extractStaticSelectorText,
  isRightClick,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds =
  | 'preferNoKernelOption'
  | 'preferOpenWithFactory'
  | 'preferHelperOverContextMenu';
type Options = [];

// '(no kernel)' menu entry, e.g. 'text=Notebook (no kernel)'
const NO_KERNEL_PATTERN = /\(no kernel\)/i;
// 'Open With' context menu entry, e.g. 'text=Open With'
const OPEN_WITH_PATTERN = /\bOpen With\b/;
// File browser items that get right-clicked to open their context menu
const FILEBROWSER_ITEM_PATTERN = /jp-DirListing|File Browser Section/;

const galataPreferContextMenuHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-context-menu-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Galata filebrowser and notebook helpers over right-click context menu flows to open files in JupyterLab tests'
    },
    messages: {
      preferNoKernelOption:
        'Prefer `page.notebook.open(name, { noKernel: true })` over selecting the "(no kernel)" entry through the context menu. The helper covers the whole flow with its waits in one call.',
      preferOpenWithFactory:
        'Prefer `page.filebrowser.open(file, factory)` over the "Open With" context menu flow (right-click, hover, click). The helper opens the file with the given factory and handles the waits.',
      preferHelperOverContextMenu:
        'Prefer a Galata helper over a right-click context menu flow when the test only needs the file opened: `page.filebrowser.open(file, factory)` or `page.notebook.open(name, { noKernel: true })`. The manual sequence adds fragile waits and repeated boilerplate.'
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

        if (NO_KERNEL_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId: 'preferNoKernelOption'
          });
        } else if (OPEN_WITH_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId: 'preferOpenWithFactory'
          });
        } else if (
          FILEBROWSER_ITEM_PATTERN.test(selectorText) &&
          isRightClick(match)
        ) {
          context.report({
            node: match.callNode,
            messageId: 'preferHelperOverContextMenu'
          });
        }
      }
    };
  }
});

export = galataPreferContextMenuHelper;
