/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { walkFrom } from '../utils/ast';
import { createRule } from '../utils/create-rule';
import {
  combineStaticSelectorText,
  enclosingTestScope,
  isRightClick,
  isTestScopeBoundary,
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

// Playwright's text pseudo-classes, which take the label in parentheses:
// `:has-text("File")`, `:text("File")`, `:text-is("File")`. Galata's own
// `getMenuBarItemLocator` builds `li:has(div.lm-MenuBar-itemLabel:text-is(…))`,
// so a test copying that shape has to be read here too.
const TEXT_PSEUDO_CLASS = ':?(?:has-)?text(?:-is)?\\(';

// A top-level menu label inside a larger selector. Only trusted when the same
// selector also carries menu markup (see MENU_MARKUP_PATTERN), e.g.
// `li[role="menuitem"]:has-text("File")`.
//
// The left boundary of the `text=` form accepts a plain space as well as `>>`
// because a locator chain such as
// `page.locator('.lm-MenuBar-item').getByText('File')` is joined into
// `.lm-MenuBar-item text=File`. The right boundary deliberately does not:
// allowing a space there would make `text=File Browser` match the label `File`.
// The pseudo-class form needs no boundary, because its closing parenthesis is
// one.
const SCOPED_MENU_BAR_LABEL_PATTERN = new RegExp(
  `(?:^|>>\\s*|\\s)text=["']?(?:${TOP_LEVEL_MENU_LABELS})["']?\\s*(?:$|>>)` +
    `|${TEXT_PSEUDO_CLASS}["']?(?:${TOP_LEVEL_MENU_LABELS})["']?\\)`
);

// Any `#jp-mainmenu-…` id, top-level menu or submenu.
//
// Every one of these names a popup, never a menu bar item. `MenuFactory` sets
// the id with `menu.id = item.id`, `Widget.id` writes it to `this.node.id`,
// and a `Menu`'s node is the `div` it adds `lm-Menu` to. Lumino's
// `MenuBar.Renderer.renderItem` builds the menu bar `li` from a class name, a
// dataset and ARIA attributes, and gives it no id at all. So `#jp-mainmenu-tabs`
// is the Tabs popup and `#jp-mainmenu-file-new` is the File > New popup; they
// differ by nesting depth only.
//
// Only JupyterLab's main menu carries these ids, so they say which menu is open
// on their own, without the lookback in `findMenuOrigin`.
const MAIN_MENU_ID_PATTERN = /#jp-mainmenu-/;

// Markers proving the selector is scoped inside an open popup menu. Note that
// `\blm-Menu\b` cannot match inside `lm-MenuBar` (there is no word boundary
// between `u` and `B`) but does match `lm-Menu-item`, `lm-Menu-content`, …
const POPUP_CONTAINER_PATTERN =
  /\blm-Menu\b|role\s*=\s*["']menu["']|#jp-mainmenu-/;

// The menu bar itself. Unlike a popup it is always on screen, so a selector
// carrying this needs nothing before it to say which menu it is on.
const MENU_BAR_CONTAINER_PATTERN = /lm-MenuBar\b/;

// Menu markup that does not resolve menu bar vs popup on its own: Lumino gives
// `role="menuitem"` to both menu bar items and popup items, and stamps
// `data-type="submenu"` on any item that opens a submenu.
//
// A toggleable item gets `role="menuitemcheckbox"` instead, which the View and
// Settings menus are full of, so both roles count. A submenu item gets no role
// at all and is reached through `data-type` instead.
const MENU_MARKUP_PATTERN =
  /role\s*=\s*["']menuitem(?:checkbox)?["']|lm-MenuBar\b|data-type\s*=\s*["']?submenu/;

// Any item label in the selector, whatever spelling it uses. Its presence is
// what makes a menu path suggestible, so `preferClickMenuItem` can be reported
// instead of the generic message.
const TEXT_SELECTOR_PATTERN = new RegExp(`text=|${TEXT_PSEUDO_CLASS}`);

// Menu items are activated with a single click, so a click is the gesture the
// rule reads. `dblclick`, `tap`, `press` and `fill` are left alone: a menu-ish
// selector combined with one of them means the test is doing something else.
//
// `hover` is the exception, and it is left alone anyway. `openLocator` opens a
// submenu by hovering its parent item, so a hover on a menu item does have a
// helper form, and reporting one would be defensible. It is skipped because a
// hover is also how a test positions the pointer for a screenshot, which is
// what the single corpus site doing it wants.
const MENU_INTERACTION_METHOD = 'click';

interface MenuEvidence {
  hasPopupContainer: boolean;
  hasMenuMarkup: boolean;
  hasTopLevelMarker: boolean;
}

function readMenuEvidence(selectorText: string): MenuEvidence {
  const hasPopupContainer = POPUP_CONTAINER_PATTERN.test(selectorText);
  const hasMenuMarkup = MENU_MARKUP_PATTERN.test(selectorText);

  // The menu bar's own class names the target outright, whatever label it
  // carries, so a third-party menu such as `Git` is covered by it even though
  // the label list is not. Failing that, a top-level label is trusted unscoped
  // (`text=File` and nothing else) or next to menu markup
  // (`li[role="menuitem"]:has-text("File")`). Any other scope means the label
  // is some other piece of UI text. No id appears here: every `#jp-mainmenu-…`
  // names a popup, so it is a container instead.
  const hasTopLevelMarker =
    MENU_BAR_CONTAINER_PATTERN.test(selectorText) ||
    BARE_MENU_BAR_LABEL_PATTERN.test(selectorText) ||
    (hasMenuMarkup && SCOPED_MENU_BAR_LABEL_PATTERN.test(selectorText));

  return { hasPopupContainer, hasMenuMarkup, hasTopLevelMarker };
}

// `MenuHelper` methods that leave the main menu open. `open` and `getMenuItem`
// are deprecated in favour of the `…Locator` forms, and both spellings appear
// in current suites, so both are recognized.
const MENU_OPENING_HELPERS: ReadonlySet<string> = new Set([
  'open',
  'openLocator',
  'clickMenuItem'
]);

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
    // The helper form of a menu bar click. `openLocator` clicks the first path
    // part and hovers the rest; `open` delegates to it; `clickMenuItem` calls
    // it and then clicks the item. `getMenuItemLocator` is not here: it walks
    // the same path but clicks and hovers nothing, so it opens no menu.
    if (
      MENU_OPENING_HELPERS.has(callee.property.name) &&
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

function collectMenuOrigins(
  root: TSESTree.Node,
  found: { origin: MenuOrigin; start: number }[]
): void {
  walkFrom(root, node => {
    if (isTestScopeBoundary(node)) {
      return 'skip-children';
    }
    if (node.type === 'CallExpression') {
      const origin = menuOriginOf(node);
      if (origin) {
        found.push({ origin, start: node.range[0] });
      }
    }
    return undefined;
  });
}

/**
 * One block's answers so far: `prefix[i]` is the last menu-opening gesture in
 * `body.slice(0, i)`, and `scanned` says how many statements have been folded
 * in. Entry 0 is always null.
 */
interface BlockScan {
  prefix: (MenuOrigin | null)[];
  scanned: number;
  latest: { origin: MenuOrigin; start: number } | null;
}
type PrefixCache = WeakMap<TSESTree.Node, BlockScan>;

/**
 * The last menu-opening gesture among the first `index` statements of `block`.
 *
 * Each statement is read once per block and the running answer is kept, because
 * a file that walks a menu many times asks about the same statements once per
 * gesture; reading them again each time costs the square of their number. The
 * scan grows only as far as it has been asked to, so a block with one gesture
 * near the top never reads the rest of it.
 */
function originBeforeStatement(
  block: TSESTree.Node,
  body: TSESTree.Node[],
  index: number,
  cache: PrefixCache
): MenuOrigin | null {
  let scan = cache.get(block);
  if (!scan) {
    scan = { prefix: [null], scanned: 0, latest: null };
    cache.set(block, scan);
  }
  while (scan.scanned < index) {
    const found: { origin: MenuOrigin; start: number }[] = [];
    collectMenuOrigins(body[scan.scanned], found);
    for (const hit of found) {
      if (!scan.latest || hit.start > scan.latest.start) {
        scan.latest = hit;
      }
    }
    scan.prefix.push(scan.latest?.origin ?? null);
    scan.scanned++;
  }
  return scan.prefix[index];
}

/**
 * The kind of menu that was last opened before `node` runs, or `null` when
 * nothing in the enclosing scopes says.
 *
 * Statements preceding `node` are read innermost block first, then outward, and
 * the last menu-opening gesture in source order wins — clicking `File` after a
 * right-click replaces the context menu with the main menu. An inner block's
 * preceding statements all come after an outer block's, so the innermost block
 * with an answer holds the latest one and the walk can stop there. The walk
 * also stops at the enclosing test callback or named helper, so one test's menu
 * state never reaches the next (see `isTestScopeBoundary`).
 */
function findMenuOrigin(
  node: TSESTree.Node,
  cache: PrefixCache
): MenuOrigin | null {
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
      const origin = originBeforeStatement(parent, body, index, cache);
      if (origin) {
        return origin;
      }
    }

    if (isTestScopeBoundary(parent)) {
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
  const scope = enclosingTestScope(node);
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
  walkFrom(scope, current => {
    if (
      (current.type === 'Literal' && typeof current.value === 'string'
        ? ANY_MENU_MARKUP_PATTERN.test(current.value)
        : false) ||
      (current.type === 'TemplateElement' &&
        ANY_MENU_MARKUP_PATTERN.test(current.value.cooked ?? ''))
    ) {
      found = true;
      return 'stop';
    }
    return undefined;
  });
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
  selectorText: string,
  cache: PrefixCache
): boolean {
  // No context menu and no dropdown carries a `#jp-mainmenu-…` id, and none is
  // inside the menu bar, so either settles it regardless of what came before.
  if (
    MAIN_MENU_ID_PATTERN.test(selectorText) ||
    MENU_BAR_CONTAINER_PATTERN.test(selectorText)
  ) {
    return true;
  }
  return findMenuOrigin(node, cache) === 'menubar';
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
        'Prefer `page.menu.openLocator(path)` (or `page.menu.clickMenuItem(path)`) over clicking the main menu bar directly.',
      preferClickMenuItem:
        "Prefer `page.menu.clickMenuItem(path)` (e.g. `'File>New>Terminal'`) over raw selectors to click a menu item.",
      preferMenuHelper:
        'Prefer the Galata `page.menu` helper (e.g. `page.menu.openLocator(path)`, `page.menu.isOpen(path)`) over raw main menu selectors.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    // Keyed by block node, so it is per file without being reset by hand.
    const prefixCache: PrefixCache = new WeakMap();

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
        // item, a main menu item and a right-click context menu item are all
        // `role="menuitem"` with an accessible name. An exact top-level label
        // is unambiguous on that evidence alone, and a popup container in the
        // same chain settles it too. Failing both, the menu bar click that
        // opened the menu answers it, which is the
        // `getByRole('menuitem', { name: 'File' })` then
        // `getByRole('menuitem', { name: 'Open from Path' })` idiom of the
        // Notebook and JupyterLite suites. With none of the three the target
        // could be a context menu item, which the planned context menu rule
        // covers.
        const viaGetByRole = match.selectorParts.some(
          part => part.method === 'getByRole'
        );
        if (
          viaGetByRole &&
          !hasTopLevelMarker &&
          !hasPopupContainer &&
          findMenuOrigin(node, prefixCache) !== 'menubar'
        ) {
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
        if (!isMainMenuTraversal(node, selectorText, prefixCache)) {
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
