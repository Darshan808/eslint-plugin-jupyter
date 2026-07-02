/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  extractStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds = 'preferSidebarOpenTab' | 'preferActivateTab';
type Options = [];

// Known sidebar tab titles mapped to their Galata sidebar tab ids
const SIDEBAR_TAB_IDS: Record<string, string> = {
  'File Browser': 'filebrowser',
  'Running Terminals and Kernels': 'jp-running-sessions',
  'Table of Contents': 'table-of-contents',
  'Extension Manager': 'extensionmanager.main-view',
  'Property Inspector': 'jp-property-inspector',
  Debugger: 'jp-debugger-sidebar'
};

const TITLE_SELECTOR_PATTERN = /\[title="([^"]+)"\]/;
// Main area (dock panel) tabs, e.g. 'div[role="main"] >> text=Lorenz.ipynb'
const MAIN_AREA_PATTERN = /\[role="main"\]|lm-DockPanel-tabBar/;

const galataPreferSidebarActivityHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-sidebar-activity-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer Galata sidebar and activity helpers over raw title/text selectors for sidebars and main area tabs'
    },
    messages: {
      preferSidebarOpenTab:
        "Prefer `page.sidebar.openTab('{{ tabId }}')` over clicking the sidebar tab by its title. The helper validates the tab exists, checks whether it is already open, and waits for activation; raw title selectors break with any label change.",
      preferActivateTab:
        'Prefer `page.activity.activateTab(name)` over selecting main area tabs with raw selectors. The helper checks the tab exists and waits for it to become active.'
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

        const titleMatch = TITLE_SELECTOR_PATTERN.exec(selectorText);
        if (titleMatch) {
          const tabId = SIDEBAR_TAB_IDS[titleMatch[1]];
          if (tabId) {
            context.report({
              node: match.callNode,
              messageId: 'preferSidebarOpenTab',
              data: { tabId }
            });
            return;
          }
        }

        if (MAIN_AREA_PATTERN.test(selectorText)) {
          context.report({
            node: match.callNode,
            messageId: 'preferActivateTab'
          });
        }
      }
    };
  }
});

export = galataPreferSidebarActivityHelper;
