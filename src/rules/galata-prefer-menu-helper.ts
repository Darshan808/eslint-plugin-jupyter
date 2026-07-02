/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  extractStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds = 'preferClickMenuItem' | 'preferMenuOpen';
type Options = [];

interface SelectorPattern {
  test: RegExp;
  messageId: MessageIds;
}

const MAIN_MENU_LABELS = [
  'File',
  'Edit',
  'View',
  'Run',
  'Kernel',
  'Tabs',
  'Settings',
  'Help'
].join('|');

// Ordered: more specific patterns first, first match wins.
const PATTERNS: SelectorPattern[] = [
  // Main menu ids, e.g. '#jp-mainmenu-file-new >> text=Terminal'
  { test: /#jp-mainmenu/, messageId: 'preferClickMenuItem' },
  // Menu bar items, e.g. '.lm-MenuBar-item:has-text("Settings")'
  { test: /lm-MenuBar/, messageId: 'preferMenuOpen' },
  // Open menu widgets, e.g. '.lm-Menu ul[role="menu"] >> text=New'
  {
    test: /lm-Menu\b|\[role="menu"\]|\[role="menuitem"\]/,
    messageId: 'preferClickMenuItem'
  },
  // Top-level menu labels, e.g. 'text=File' (exact match only, so
  // 'text=File Browser' is not flagged)
  {
    test: new RegExp(`^text=(${MAIN_MENU_LABELS})$`),
    messageId: 'preferMenuOpen'
  }
];

const galataPreferMenuHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-menu-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer the Galata menu helper over raw Playwright selectors for JupyterLab main menu interactions'
    },
    messages: {
      preferClickMenuItem:
        "Prefer `page.menu.clickMenuItem('File>New>Terminal')` over raw menu selectors. The helper closes any open menu first, walks nested submenus consistently, and waits for submenu activation.",
      preferMenuOpen:
        "Prefer `page.menu.open('File')` — or `page.menu.clickMenuItem('File>...')` for a full path — over clicking the menu bar directly. Raw menu clicks are brittle because open menu state and hover timing can change the target."
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

export = galataPreferMenuHelper;
