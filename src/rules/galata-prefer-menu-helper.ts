/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';
import {
  combineStaticSelectorText,
  isRightClick,
  matchSelectorInteraction,
  resolveLocatorBinding
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

// A single-segment id, e.g. `#jp-mainmenu-tabs`, as opposed to a nested one
// like `#jp-mainmenu-file-new`. `MenuFactory` puts the id on the `Menu` widget,
// so both name a popup and neither names the menu bar `li`; the single-segment
// form is the popup a menu bar click opens, so `page.menu.open(label)` is the
// call that produces it.
const TOP_LEVEL_MENU_ID_PATTERN = /#jp-mainmenu-[a-z]+(?![a-z-])/;

// Any `#jp-mainmenu-…` id, top-level menu or submenu. Only JupyterLab's main
// menu carries these ids, so they say which menu is open on their own, without
// the lookback in `findMenuOrigin`.
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
    TOP_LEVEL_MENU_ID_PATTERN.test(selectorText) ||
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

  // A right-click is the one gesture that opens the context menu. Which element
  // it targets does not matter here, so the chain does not have to resolve to
  // `page` first: `const item = page.locator(a); item.click({ button:
  // 'right' })` and `page.activity.getTabLocator(b).click({ button: 'right' })`
  // open the context menu just as `page.click(a, { button: 'right' })` does.
  if (
    callee.type === 'MemberExpression' &&
    callee.property.type === 'Identifier' &&
    callee.property.name === MENU_INTERACTION_METHOD &&
    isRightClick(node)
  ) {
    return 'context';
  }

  const match = matchSelectorInteraction(node);
  if (!match) {
    return null;
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

// Calls whose callback is stored and run later. Statements next to such a call
// say nothing about the state its body starts in.
const DEFERRED_CALLBACK_CALLEES: ReadonlySet<string> = new Set([
  'test',
  'it',
  'describe',
  'suite',
  'beforeAll',
  'beforeEach',
  'afterAll',
  'afterEach'
]);

function rootCalleeName(node: TSESTree.Expression): string | null {
  let current: TSESTree.Node = node;
  while (current.type === 'MemberExpression') {
    current = current.object;
  }
  return current.type === 'Identifier' ? current.name : null;
}

/**
 * Whether the lookback must stop before leaving `node`, and whether the scan of
 * preceding statements must stop before entering it.
 *
 * A callback written inline runs where it stands, so the statements above it
 * did run first and the walk continues through it: `perf.measure(async () => {
 * … })` keeps the menu its caller opened. A named helper and a test callback do
 * not. `async function openMenu(page) { … }` can be called from anywhere, and
 * `test('b', …)` does not run after the body of `test('a', …)`, so a
 * right-click in one test must not silence the next one.
 */
function isLookbackBoundary(node: TSESTree.Node): boolean {
  if (node.type === 'FunctionDeclaration') {
    return true;
  }
  if (
    node.type !== 'FunctionExpression' &&
    node.type !== 'ArrowFunctionExpression'
  ) {
    return false;
  }
  const parent = node.parent;
  if (parent?.type === 'VariableDeclarator' || parent?.type === 'Property') {
    return true;
  }
  return (
    parent?.type === 'CallExpression' &&
    parent.arguments.includes(node) &&
    DEFERRED_CALLBACK_CALLEES.has(rootCalleeName(parent.callee) ?? '')
  );
}

function collectMenuOrigins(
  node: TSESTree.Node,
  found: { origin: MenuOrigin; start: number }[]
): void {
  if (isLookbackBoundary(node)) {
    return;
  }
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
 * after a right-click replaces the context menu with the main menu. The walk
 * stops at the enclosing test callback or named helper, so one test's menu
 * state never reaches the next (see `isLookbackBoundary`).
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

    if (isLookbackBoundary(parent)) {
      return null;
    }
    current = parent;
    parent = parent.parent;
  }

  return null;
}

// Any mention of menu markup at all, used to confirm that a bare top-level
// label really is the menu bar. Wider than the patterns above because it is
// matched against every string in the test, not against a gesture's selector.
const ANY_MENU_MARKUP_PATTERN =
  /\blm-Menu|#jp-mainmenu-|role\s*=\s*["']?menuitem|role\s*=\s*["']?menu["']?\s*\]|data-type\s*=\s*["']?submenu/;

// The word itself, matched only against a test title.
const MENU_WORD_PATTERN = /menus?\b/i;

/**
 * Whether the test around `node` is about a menu.
 *
 * `page.click('text=File')` carries no DOM evidence: the eight built-in labels
 * are ordinary words, and a dialog button reading `Run` looks the same. A test
 * that walks the menu bar names the menu somewhere, in its title or in a
 * selector that reaches the popup it opened, so that mention is what separates
 * the two.
 *
 * The title takes the bare word, because a person wrote it to describe the
 * test. Every other string has to carry real markup: `menu` inside a selector
 * or a file name says nothing.
 */
function testMentionsMenuMarkup(node: TSESTree.Node): boolean {
  let scope: TSESTree.Node = node;
  while (scope.parent && !isLookbackBoundary(scope)) {
    scope = scope.parent;
  }
  // The title of a `test(…)` sits next to its callback rather than inside it.
  // It is a sentence a person wrote about what the test does, so the bare word
  // is enough there, where in a selector it would not be.
  const enclosingCall = scope.parent;
  if (enclosingCall?.type === 'CallExpression') {
    const title = enclosingCall.arguments[0];
    if (
      title?.type === 'Literal' &&
      typeof title.value === 'string' &&
      MENU_WORD_PATTERN.test(title.value)
    ) {
      return true;
    }
  }
  let found = false;
  const visit = (current: TSESTree.Node): void => {
    if (found) {
      return;
    }
    if (
      (current.type === 'Literal' && typeof current.value === 'string'
        ? ANY_MENU_MARKUP_PATTERN.test(current.value)
        : false) ||
      (current.type === 'TemplateElement' &&
        ANY_MENU_MARKUP_PATTERN.test(current.value.cooked ?? ''))
    ) {
      found = true;
      return;
    }
    for (const [key, value] of Object.entries(
      current as unknown as Record<string, unknown>
    )) {
      if (key === 'parent') {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          if (isNode(item)) {
            visit(item);
          }
        }
      } else if (isNode(value)) {
        visit(value);
      }
    }
  };
  visit(scope);
  return found;
}

/**
 * Whether a click on popup menu markup is walking the main menu.
 *
 * Lumino gives every menu the same markup: `.lm-Menu` for the widget node,
 * `role="menu"` for its content, `.lm-Menu-item` and `role="menuitem"` for its
 * items. The context menu shares it, and so does every dropdown opened from a
 * toolbar button. JupyterLab builds six of those on its own (the console
 * prompt menu, the debugger pause-on-exceptions menu, two file editor menus,
 * the terminal theme menu, the table of contents toolbar menu), and extensions
 * add more, none of which `page.menu` drives. So popup markup alone proves
 * nothing and the rule needs the main menu to have been opened first.
 *
 * A `#jp-mainmenu-…` id settles it from the selector. Otherwise the last
 * menu-opening gesture before this one has to be a menu bar click, either raw
 * or through `page.menu.open`.
 */
function isMainMenuTraversal(
  node: TSESTree.Node,
  selectorText: string
): boolean {
  // No context menu and no dropdown carries a `#jp-mainmenu-…` id, so the
  // selector settles it regardless of what came before.
  if (MAIN_MENU_ID_PATTERN.test(selectorText)) {
    return true;
  }
  return findMenuOrigin(node) === 'menubar';
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
        // Most call expressions are not interactions at all, and
        // `matchSelectorInteraction` rejects them on the callee alone, so the
        // scope is looked up only once something actually needs it.
        let scope: TSESLint.Scope.Scope | null = null;
        const currentScope = (): TSESLint.Scope.Scope =>
          (scope ??= context.sourceCode.getScope(node));

        const match = matchSelectorInteraction(node, identifier =>
          resolveLocatorBinding(identifier, currentScope())
        );
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
          // A label on its own is just a word. `File`, `Run` and `Help` name
          // dialog buttons and file names too, so a selector carrying nothing
          // but the label needs the test to mention menu markup somewhere.
          if (
            !hasMenuMarkup &&
            !MAIN_MENU_ID_PATTERN.test(selectorText) &&
            !testMentionsMenuMarkup(node)
          ) {
            return;
          }
          context.report({
            node: match.callNode,
            messageId: 'preferMenuOpen'
          });
          return;
        }

        // Everything left is a click inside some open popup menu. Which one it
        // is has to come from what opened it; a context menu belongs to the
        // planned context menu rule, and a toolbar dropdown to no rule at all.
        if (!isMainMenuTraversal(node, selectorText)) {
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
