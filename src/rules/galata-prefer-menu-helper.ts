/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { createRule } from '../utils/create-rule';
import {
  combineStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds = 'preferMenuOpen' | 'preferClickMenuItem' | 'preferMenuHelper';
type Options = [];

const TOP_LEVEL_MENU_LABELS = 'File|Edit|View|Run|Kernel|Tabs|Settings|Help';

// The whole text value of a match is exactly a top-level menu label:
// `text=File`, `… >> text=File`, `:has-text("File")`. Anchoring on the label
// means names that merely start with one (`text=New File`, `text=Close Tab`)
// are not mistaken for a menu bar item.
const MENU_BAR_LABEL_PATTERN = new RegExp(
  `(?:^|>>\\s*)text=["']?(?:${TOP_LEVEL_MENU_LABELS})["']?\\s*(?:$|>>)` +
    `|has-text\\(["']?(?:${TOP_LEVEL_MENU_LABELS})["']?\\)`
);

// A single-segment menu bar item id, e.g. `#jp-mainmenu-tabs`, as opposed to a
// submenu id like `#jp-mainmenu-file-new`.
const MENU_BAR_ID_PATTERN = /#jp-mainmenu-[a-z]+(?![a-z-])/;

// Markers proving the selector is scoped inside an open popup menu. Note that
// `\blm-Menu\b` cannot match inside `lm-MenuBar` (there is no word boundary
// between `u` and `B`) but does match `lm-Menu-item`, `lm-Menu-content`, …
const POPUP_CONTAINER_PATTERN =
  /\blm-Menu\b|role\s*=\s*["']menu["']|#jp-mainmenu-[a-z]+-[a-z-]+/;

// Menu markup that does not resolve menu bar vs popup on its own: Lumino gives
// `role="menuitem"` to both menu bar items and popup items.
const MENU_MARKUP_PATTERN = /role\s*=\s*["']menuitem["']|lm-MenuBar\b/;

const TEXT_SELECTOR_PATTERN = /text=|has-text\(/;

// Menus are activated by pointer gestures and keyboard, not by form-control
// interactions. `hover` matters because Lumino switches open submenus on hover.
const MENU_INTERACTION_METHODS: ReadonlySet<string> = new Set([
  'click',
  'dblclick',
  'hover',
  'tap',
  'press'
]);

const galataPreferMenuHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-menu-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer the Galata menu helper over raw Playwright selectors for JupyterLab main menu traversal'
    },
    messages: {
      preferMenuOpen:
        "Prefer `page.menu.open('File')` (or `page.menu.clickMenuItem('File>…')`) over clicking the main menu bar directly.",
      preferClickMenuItem:
        "Prefer `page.menu.clickMenuItem('File>New>Terminal')` over raw selectors to click a menu item.",
      preferMenuHelper:
        'Prefer the Galata `page.menu` helper (e.g. `page.menu.open(path)`, `page.menu.isOpen(path)`) over raw main menu selectors.'
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

        if (!MENU_INTERACTION_METHODS.has(match.interactionMethod)) {
          return;
        }

        // Right-clicks open the context menu, not the main menu.
        if (match.isRightClick) {
          return;
        }

        const selectorText = combineStaticSelectorText(match);
        if (selectorText === null) {
          return;
        }

        const hasTopLevelMarker =
          MENU_BAR_LABEL_PATTERN.test(selectorText) ||
          MENU_BAR_ID_PATTERN.test(selectorText);
        const hasPopupContainer = POPUP_CONTAINER_PATTERN.test(selectorText);
        const hasMenuMarkup = MENU_MARKUP_PATTERN.test(selectorText);

        if (!hasTopLevelMarker && !hasPopupContainer && !hasMenuMarkup) {
          return;
        }

        // A popup container proves the target sits inside an already open menu,
        // so it wins over a top-level label appearing in the same selector.
        if (hasTopLevelMarker && !hasPopupContainer) {
          context.report({
            node: match.callNode,
            messageId: 'preferMenuOpen'
          });
          return;
        }

        // Without an item label there is no path to suggest, so fall back to
        // the generic helper message.
        context.report({
          node: match.callNode,
          messageId: TEXT_SELECTOR_PATTERN.test(selectorText)
            ? 'preferClickMenuItem'
            : 'preferMenuHelper'
        });
      }
    };
  }
});

export = galataPreferMenuHelper;
