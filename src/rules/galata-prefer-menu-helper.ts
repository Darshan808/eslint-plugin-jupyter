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

// The entire selector is a bare text query for a top-level menu label:
// `text=File`, `text="Settings"`.
const BARE_MENU_BAR_LABEL_PATTERN = new RegExp(
  `^text=["']?(?:${TOP_LEVEL_MENU_LABELS})["']?$`
);

// A top-level menu label inside a larger selector. Only trusted when the same
// selector also carries menu markup (see MENU_MARKUP_PATTERN), e.g.
// `li[role="menuitem"]:has-text("File")`.
//
// The left boundary accepts a plain space as well as `>>` because a locator
// chain such as `page.locator('.lm-MenuBar-item').getByText('File')` is joined
// into `.lm-MenuBar-item text=File`. The right boundary deliberately does not:
// allowing a space there would make `text=File Browser` match the label `File`.
const SCOPED_MENU_BAR_LABEL_PATTERN = new RegExp(
  `(?:^|>>\\s*|\\s)text=["']?(?:${TOP_LEVEL_MENU_LABELS})["']?\\s*(?:$|>>)` +
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

// Menu items are activated with a single click, and `MenuHelper` has no
// equivalent for any other gesture — so there is nothing useful to suggest for
// one. Every other gesture (`dblclick`, `hover`, `tap`, `press`, `fill`, …) is
// left alone: a menu-ish selector combined with one of them means the test is
// doing something else.
const MENU_INTERACTION_METHOD = 'click';

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
        'Prefer `page.menu.open(path)` (or `page.menu.clickMenuItem(path)`) over clicking the main menu bar directly.',
      preferClickMenuItem:
        "Prefer `page.menu.clickMenuItem(path)` (e.g. `'File>New>Terminal'`) over raw selectors to click a menu item.",
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

        if (match.interactionMethod !== MENU_INTERACTION_METHOD) {
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

        const hasPopupContainer = POPUP_CONTAINER_PATTERN.test(selectorText);
        const hasMenuMarkup = MENU_MARKUP_PATTERN.test(selectorText);

        // A top-level label is only trusted unscoped (`text=File` and nothing
        // else) or next to menu markup (`li[role="menuitem"]:has-text("File")`).
        // Any other scope means the label is some other piece of UI text.
        const hasTopLevelMarker =
          MENU_BAR_ID_PATTERN.test(selectorText) ||
          BARE_MENU_BAR_LABEL_PATTERN.test(selectorText) ||
          (hasMenuMarkup && SCOPED_MENU_BAR_LABEL_PATTERN.test(selectorText));

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
