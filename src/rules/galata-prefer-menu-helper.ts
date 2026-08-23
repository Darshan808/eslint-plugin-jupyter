/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';
import {
  combineStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds = 'preferMenuOpen' | 'preferClickMenuItem' | 'preferMenuHelper';
type Options = [];

// JupyterLab's main menu bar
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

// Any `#jp-mainmenu-…` id, menu bar item or submenu. Only JupyterLab's main
// menu carries these ids, so they settle the main menu vs context menu question
// on their own (see `isContextMenuTraversal`).
const MAIN_MENU_ID_PATTERN = /#jp-mainmenu-/;

// Markers proving the selector is scoped inside an open popup menu. Note that
// `\blm-Menu\b` cannot match inside `lm-MenuBar` (there is no word boundary
// between `u` and `B`) but does match `lm-Menu-item`, `lm-Menu-content`, …
const POPUP_CONTAINER_PATTERN =
  /\blm-Menu\b|role\s*=\s*["']menu["']|#jp-mainmenu-[a-z]+-[a-z-]+/;

// Menu markup that does not resolve menu bar vs popup on its own: Lumino gives
// `role="menuitem"` to both menu bar items and popup items, and stamps
// `data-type="submenu"` on any item that opens a submenu.
const MENU_MARKUP_PATTERN =
  /role\s*=\s*["']menuitem["']|lm-MenuBar\b|data-type\s*=\s*["']?submenu/;

const TEXT_SELECTOR_PATTERN = /text=|has-text\(/;

// Menu items are activated with a single click, and `MenuHelper` has no
// equivalent for any other gesture — so there is nothing useful to suggest for
// one. Every other gesture (`dblclick`, `hover`, `tap`, `press`, `fill`, …) is
// left alone: a menu-ish selector combined with one of them means the test is
// doing something else.
const MENU_INTERACTION_METHOD = 'click';

interface MenuEvidence {
  hasPopupContainer: boolean;
  hasMenuMarkup: boolean;
  hasTopLevelMarker: boolean;
}

function readMenuEvidence(selectorText: string): MenuEvidence {
  const hasPopupContainer = POPUP_CONTAINER_PATTERN.test(selectorText);
  const hasMenuMarkup = MENU_MARKUP_PATTERN.test(selectorText);

  // A top-level label is only trusted unscoped (`text=File` and nothing else)
  // or next to menu markup (`li[role="menuitem"]:has-text("File")`). Any other
  // scope means the label is some other piece of UI text.
  const hasTopLevelMarker =
    MENU_BAR_ID_PATTERN.test(selectorText) ||
    BARE_MENU_BAR_LABEL_PATTERN.test(selectorText) ||
    (hasMenuMarkup && SCOPED_MENU_BAR_LABEL_PATTERN.test(selectorText));

  return { hasPopupContainer, hasMenuMarkup, hasTopLevelMarker };
}

// Which kind of menu a call leaves open on screen.
type MenuOrigin = 'menubar' | 'context';

function menuOriginOf(node: TSESTree.CallExpression): MenuOrigin | null {
  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier'
  ) {
    // `page.menu.openContextMenu(selector)` / `openContextMenuLocator(selector)`
    if (callee.property.name.startsWith('openContextMenu')) {
      return 'context';
    }
    // `page.menu.open(path)` / `page.menu.clickMenuItem(path)` both leave the
    // main menu open — the helper form of a menu bar click.
    if (
      (callee.property.name === 'open' ||
        callee.property.name === 'clickMenuItem') &&
      callee.object.type === 'MemberExpression' &&
      callee.object.property.type === 'Identifier' &&
      callee.object.property.name === 'menu'
    ) {
      return 'menubar';
    }
  }

  const match = matchSelectorInteraction(node);
  if (!match) {
    return null;
  }
  // A right-click is the one gesture that opens the context menu.
  if (match.isRightClick) {
    return 'context';
  }
  if (match.interactionMethod !== MENU_INTERACTION_METHOD) {
    return null;
  }
  const selectorText = combineStaticSelectorText(match);
  if (selectorText === null) {
    return null;
  }
  const evidence = readMenuEvidence(selectorText);
  // Clicking a menu bar item — the same shape the rule reports as
  // `preferMenuOpen` — is what opens the main menu.
  return evidence.hasTopLevelMarker && !evidence.hasPopupContainer
    ? 'menubar'
    : null;
}

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

function collectMenuOrigins(
  node: TSESTree.Node,
  found: { origin: MenuOrigin; start: number }[]
): void {
  if (node.type === 'CallExpression') {
    const origin = menuOriginOf(node);
    if (origin) {
      found.push({ origin, start: node.range[0] });
    }
  }
  for (const [key, value] of Object.entries(
    node as unknown as Record<string, unknown>
  )) {
    // `parent` is a back-reference; following it would not terminate.
    if (key === 'parent') {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        if (isNode(item)) {
          collectMenuOrigins(item, found);
        }
      }
    } else if (isNode(value)) {
      collectMenuOrigins(value, found);
    }
  }
}

/**
 * The kind of menu that was last opened before `node` runs, or `null` when
 * nothing in the enclosing scopes says.
 *
 * Statements preceding `node` are scanned innermost block first, then outward,
 * and the last menu-opening gesture in source order wins — clicking `File`
 * after a right-click replaces the context menu with the main menu.
 */
function findMenuOrigin(node: TSESTree.Node): MenuOrigin | null {
  let current: TSESTree.Node = node;
  let parent = current.parent;

  while (parent) {
    let body: TSESTree.Node[] | null = null;
    if (parent.type === 'BlockStatement' || parent.type === 'Program') {
      body = parent.body;
    } else if (parent.type === 'SwitchCase') {
      body = parent.consequent;
    }

    const index = body ? body.indexOf(current) : -1;
    if (body && index > 0) {
      const found: { origin: MenuOrigin; start: number }[] = [];
      for (const statement of body.slice(0, index)) {
        collectMenuOrigins(statement, found);
      }
      if (found.length > 0) {
        found.sort((a, b) => a.start - b.start);
        return found[found.length - 1].origin;
      }
    }

    current = parent;
    parent = parent.parent;
  }

  return null;
}

/**
 * Whether a click on popup menu markup is walking a context menu rather than
 * the main menu.
 *
 * Lumino gives every menu the same markup, so `.lm-Menu li[role="menuitem"]`
 * cannot say which menu it is on its own. The nearest preceding menu-opening
 * gesture can: a right-click (or `page.menu.openContextMenu*`) means the open
 * popup is the context menu, and `page.menu.clickMenuItem` would be the wrong
 * fix to suggest.
 */
function isContextMenuTraversal(
  node: TSESTree.Node,
  selectorText: string
): boolean {
  // No context menu carries a `#jp-mainmenu-…` id, so the selector settles it
  // regardless of what came before.
  if (MAIN_MENU_ID_PATTERN.test(selectorText)) {
    return false;
  }
  return findMenuOrigin(node) === 'context';
}

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

        const { hasPopupContainer, hasMenuMarkup, hasTopLevelMarker } =
          readMenuEvidence(selectorText);

        if (!hasTopLevelMarker && !hasPopupContainer && !hasMenuMarkup) {
          return;
        }

        // `getByRole('menuitem', { name })` carries no scope at all: a menu bar
        // item, a main menu item, and a right-click context menu item are all
        // `role="menuitem"` with an accessible name. Only an exact top-level
        // label is unambiguous enough to report on that evidence alone; a
        // deeper item needs a real popup container in the same chain. The rest
        // is left to the planned context menu rule.
        const viaGetByRole = match.selectorParts.some(
          part => part.method === 'getByRole'
        );
        if (viaGetByRole && !hasTopLevelMarker && !hasPopupContainer) {
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

        // The open menu may be the context menu, which `page.menu.clickMenuItem`
        // does not drive. That belongs to the planned context menu rule.
        if (isContextMenuTraversal(node, selectorText)) {
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
