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
  extractStaticSelectorText,
  isRightClick,
  isTestScopeBoundary,
  matchSelectorInteraction,
  resolveLocatorBinding
} from '../utils/playwright-selectors';

type MessageIds =
  | 'preferNotebookOpenNoKernel'
  | 'preferFilebrowserOpenFactory'
  | 'preferFilebrowserOpen';
type Options = [];

// The label of the file browser context menu submenu that lists the document
// factories a file can be opened with.
const OPEN_WITH_LABEL_PATTERN = /^open with$/i;

// The factory `notebook-extension` adds to `Open With` for a notebook opened
// without starting a kernel.
const NO_KERNEL_FACTORY_PATTERN = /^notebook \(no kernel\)$/i;

// Markup proving a selector is scoped inside an open Lumino popup menu — the
// submenu, once `Open With` has been opened.
const POPUP_MENU_PATTERN =
  /\blm-Menu\b|role\s*=\s*["']menuitem(?:checkbox)?["']|role\s*=\s*["']menu["']/;

// The whole selector is a text query, `text=Markdown Preview`. Once the
// `Open With` submenu is open a bare label click lands in it, which is how
// every corpus site spells the factory click.
const BARE_TEXT_QUERY_PATTERN = /^text=/;

// A file browser listing item.
const FILE_BROWSER_ITEM_PATTERN = /\bjp-DirListing-item\b/;

// A label carried by a `text=` engine query, which `combineStaticSelectorText`
// also normalizes `getByText(…)` and `getByRole(role, { name })` into.
const TEXT_QUERY_LABEL_PATTERN = /(?:^|\s|>>\s*)text=\s*(.+)$/;

// The same label written with one of Playwright's text pseudo-classes:
// `:has-text("Editor")`, `:text("Editor")`, `:text-is("Editor")`. The quoted
// form is tried first so that a label containing a `)` survives.
const QUOTED_PSEUDO_LABEL_PATTERN =
  /:(?:has-)?text(?:-is)?\(\s*["'](.+?)["']\s*\)/;
const BARE_PSEUDO_LABEL_PATTERN =
  /:(?:has-)?text(?:-is)?\(\s*([^"')][^)]*?)\s*\)/;

// Keys that extend a file browser selection rather than moving it. A context
// menu opened over several selected files acts on all of them, and no helper
// opens more than one document, so the rule stays quiet there.
//
// Only these spellings count. `Shift+Enter` and `Control+Enter` are notebook
// run shortcuts and select nothing, so a blanket "any modified key" test would
// silence genuine findings.
const SELECTION_KEY_PATTERN =
  /^(?:Shift|Control|Meta|ControlOrMeta)\+(?:Arrow(?:Up|Down|Left|Right)|Home|End|[aA])$/;

// Modifiers that turn a click into a selection change: shift extends the
// range, control/meta toggles one item.
const SELECTION_MODIFIERS: ReadonlySet<string> = new Set([
  'Shift',
  'Control',
  'Meta',
  'ControlOrMeta'
]);

// Interactions that only observe. A wait between the right-click and the
// factory click does not change what is on screen, so it must not break the
// sequence.
const OBSERVING_METHODS: ReadonlySet<string> = new Set(['waitForSelector']);

/**
 * What a call does to the context menu flow the rule is looking for.
 *
 * `otherGesture` is any interaction the rule cannot place. It is tracked rather
 * than ignored, because a gesture in the middle of the flow means the pointer
 * left the submenu and the click after it is no longer the factory click.
 */
type GestureKind =
  | 'contextMenuOpen'
  | 'menuClose'
  | 'multiSelect'
  | 'singleSelect'
  | 'openWith'
  | 'menuItemClick'
  | 'otherGesture';

interface Gesture {
  kind: GestureKind;
  /** Source offset, so gestures can be put back in source order. */
  start: number;
  node: TSESTree.CallExpression;
  /** The item label a `menuItemClick` targets, when it is static. */
  label: string | null;
}

/**
 * The item label a selector looks for, or null when it carries none.
 *
 * A label is required to have a word character in it, so that the leftover
 * static text of a fully interpolated name — `` `text=${factory}` `` reduces to
 * `text=` — does not read as a label.
 */
function extractItemLabel(selectorText: string): string | null {
  const match =
    TEXT_QUERY_LABEL_PATTERN.exec(selectorText) ??
    QUOTED_PSEUDO_LABEL_PATTERN.exec(selectorText) ??
    BARE_PSEUDO_LABEL_PATTERN.exec(selectorText);
  if (!match) {
    return null;
  }
  const label = match[1]
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim();
  return /\w/.test(label) ? label : null;
}

function isPageKeyboard(node: TSESTree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.object.type === 'Identifier' &&
    node.object.name === 'page' &&
    node.property.type === 'Identifier' &&
    node.property.name === 'keyboard'
  );
}

/**
 * Whether a call's receiver is Galata's menu helper, `….menu`.
 */
function isMenuHelperReceiver(node: TSESTree.Node): boolean {
  return (
    node.type === 'MemberExpression' &&
    !node.computed &&
    node.property.type === 'Identifier' &&
    node.property.name === 'menu'
  );
}

/** `page.menu.closeAll()`, which dismisses whatever menu is open. */
function isMenuCloseAll(callee: TSESTree.MemberExpression): boolean {
  return (
    callee.property.type === 'Identifier' &&
    callee.property.name === 'closeAll' &&
    isMenuHelperReceiver(callee.object)
  );
}

/** `page.click(sel, { modifiers: ['Shift'] })` and friends. */
function hasSelectionModifier(node: TSESTree.CallExpression): boolean {
  return node.arguments.some(
    arg =>
      arg.type === 'ObjectExpression' &&
      arg.properties.some(
        prop =>
          prop.type === 'Property' &&
          !prop.computed &&
          ((prop.key.type === 'Identifier' && prop.key.name === 'modifiers') ||
            (prop.key.type === 'Literal' && prop.key.value === 'modifiers')) &&
          prop.value.type === 'ArrayExpression' &&
          prop.value.elements.some(
            element =>
              element?.type === 'Literal' &&
              typeof element.value === 'string' &&
              SELECTION_MODIFIERS.has(element.value)
          )
      )
  );
}

/**
 * Reads one call as a step of the context menu flow, or null when the call
 * changes nothing the rule tracks.
 */
function classifyGesture(
  node: TSESTree.CallExpression,
  resolveBinding: (identifier: TSESTree.Identifier) => TSESTree.Node | null
): Gesture | null {
  const gesture = (
    kind: GestureKind,
    label: string | null = null
  ): Gesture => ({
    kind,
    start: node.range[0],
    node,
    label
  });

  const callee = node.callee;
  if (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier'
  ) {
    // `page.menu.openContextMenu(selector)` / `openContextMenuLocator(selector)`
    // right-click the target themselves, so they open the context menu exactly
    // as a raw right-click does. A test that uses them and then walks
    // `Open With` by hand is still the sequence this rule replaces.
    if (
      callee.property.name.startsWith('openContextMenu') &&
      isMenuHelperReceiver(callee.object)
    ) {
      return gesture('contextMenuOpen');
    }
    if (isMenuCloseAll(callee)) {
      return gesture('menuClose');
    }
    if (callee.property.name === 'press' && isPageKeyboard(callee.object)) {
      const keyArg = node.arguments[0];
      const key =
        keyArg && keyArg.type !== 'SpreadElement'
          ? extractStaticSelectorText(keyArg, { allowPartialTemplate: false })
          : null;
      if (key === 'Escape') {
        return gesture('menuClose');
      }
      if (key !== null && SELECTION_KEY_PATTERN.test(key)) {
        return gesture('multiSelect');
      }
      return gesture('otherGesture');
    }
    // A right-click is the one gesture that opens the context menu, whatever it
    // targets, so the receiver does not have to resolve to `page` first:
    // `const item = page.locator(a); await item.click({ button: 'right' });`
    // opens it just as `page.click(a, { button: 'right' })` does.
    if (callee.property.name === 'click') {
      if (isRightClick(node)) {
        return gesture('contextMenuOpen');
      }
      if (hasSelectionModifier(node)) {
        return gesture('multiSelect');
      }
    }
  }

  const match = matchSelectorInteraction(node, resolveBinding);
  if (!match) {
    return null;
  }
  if (OBSERVING_METHODS.has(match.interactionMethod)) {
    return null;
  }

  const selectorText = combineStaticSelectorText(match);
  if (selectorText === null) {
    // An interaction on a selector the rule cannot read still happened, and it
    // may have dismissed the menu, so it counts as a gesture.
    return gesture('otherGesture');
  }
  const label = extractItemLabel(selectorText);

  // The submenu opens on hover and on click alike: Lumino opens a submenu when
  // the pointer rests on its parent item, and clicking the item opens it too.
  // Both spellings appear in the corpus.
  if (
    label !== null &&
    OPEN_WITH_LABEL_PATTERN.test(label) &&
    (match.interactionMethod === 'hover' || match.interactionMethod === 'click')
  ) {
    return gesture('openWith');
  }

  // A menu item is activated with a single click. A hover on a factory item is
  // deliberately not one: it opens nothing, and the tests that hover a factory
  // are screenshotting the submenu, which no helper can do.
  if (match.interactionMethod === 'click') {
    if (POPUP_MENU_PATTERN.test(selectorText)) {
      return gesture('menuItemClick', label);
    }
    if (label !== null && BARE_TEXT_QUERY_PATTERN.test(selectorText)) {
      return gesture('menuItemClick', label);
    }
    // A plain click on a listing item leaves that one file selected, so a
    // right-click after it acts on a single document again even if an earlier
    // statement had extended the selection.
    if (FILE_BROWSER_ITEM_PATTERN.test(selectorText)) {
      return gesture('singleSelect');
    }
  }

  return gesture('otherGesture');
}

/**
 * Every gesture inside `scope`, in source order.
 *
 * Nested test callbacks and named helpers are not entered: their statements do
 * not run where they are written, so one test's menu state must not reach the
 * next. Gestures inside an `if` or a loop *are*
 * collected, because the flow the rule looks for is a fixed three-step sequence
 * that no corpus site splits across branches.
 */
function collectGestures(
  scope: TSESTree.Node,
  resolveBinding: (identifier: TSESTree.Identifier) => TSESTree.Node | null
): Gesture[] {
  const gestures: Gesture[] = [];
  walkFrom(scope, node => {
    if (node !== scope && isTestScopeBoundary(node)) {
      return 'skip-children';
    }
    if (node.type === 'CallExpression') {
      const gesture = classifyGesture(node, resolveBinding);
      if (gesture) {
        gestures.push(gesture);
      }
    }
    // A gesture can sit inside another call's arguments — `Promise.all([…,
    // page.click(…)])` — so children are visited whether or not this node was
    // itself a gesture.
    return undefined;
  });
  return gestures.sort((left, right) => left.start - right.start);
}

/**
 * Whether the call is the whole of its statement, `await page.click(…);`.
 */
function isOwnStatement(node: TSESTree.CallExpression): boolean {
  let current: TSESTree.Node = node;
  let parent = current.parent;
  while (
    parent &&
    (parent.type === 'AwaitExpression' ||
      parent.type === 'TSNonNullExpression' ||
      parent.type === 'TSAsExpression')
  ) {
    current = parent;
    parent = current.parent;
  }
  return parent?.type === 'ExpressionStatement';
}

interface Finding {
  messageId: MessageIds;
  factory: string | null;
}

/**
 * Replays the gestures of one test and returns the factory clicks that complete
 * a raw `Open With` sequence, keyed by the call to report.
 *
 * The flow is three steps: something opens the context menu, `Open With` opens
 * the factory submenu, and a click on a factory opens the document. The factory
 * click has to be the first item click after `Open With` — an item clicked
 * later is in some other menu, because activating an item closes the one it was
 * in.
 */
function findOpenWithFlows(
  scope: TSESTree.Node,
  resolveBinding: (identifier: TSESTree.Identifier) => TSESTree.Node | null
): Map<TSESTree.CallExpression, Finding> {
  const findings = new Map<TSESTree.CallExpression, Finding>();
  // The open context menu, and whether more than one file was selected when it
  // was opened.
  let contextMenu: { multiSelect: boolean } | null = null;
  let multiSelectSeen = false;
  let openWithOpen = false;

  for (const gesture of collectGestures(scope, resolveBinding)) {
    switch (gesture.kind) {
      case 'multiSelect':
        multiSelectSeen = true;
        break;
      case 'singleSelect':
        multiSelectSeen = false;
        // Clicking in the file browser also dismisses whatever menu was open.
        contextMenu = null;
        openWithOpen = false;
        break;
      case 'contextMenuOpen':
        // The selection outlives the menu, so `multiSelectSeen` is not reset
        // here. A right-click on an item that is already part of a multi-file
        // selection keeps the whole selection, and only a plain click narrows
        // it back to one. Which of the two a right-click is cannot be read off
        // the selector: `Shift+ArrowDown` extends the selection to a neighbour
        // the test never names, so the item right-clicked next may well be
        // that neighbour. Staying with the wider selection is the answer that
        // does not invent a report.
        contextMenu = { multiSelect: multiSelectSeen };
        openWithOpen = false;
        break;
      case 'menuClose':
        contextMenu = null;
        openWithOpen = false;
        break;
      case 'openWith':
        // `Open With` only exists in the file browser context menu, so with
        // nothing having opened one the hover is on something else, or on a
        // context menu opened outside this test — either way the rule has no
        // sequence to replace.
        openWithOpen = contextMenu !== null;
        break;
      case 'menuItemClick': {
        if (openWithOpen && contextMenu) {
          const finding = describeFlow(gesture, contextMenu.multiSelect);
          if (finding) {
            findings.set(gesture.node, finding);
          }
        }
        // Activating an item closes the menu it was in.
        contextMenu = null;
        openWithOpen = false;
        break;
      }
      case 'otherGesture':
        // A gesture the rule cannot place may have dismissed the menu, so what
        // is on screen is no longer known.
        contextMenu = null;
        openWithOpen = false;
        break;
    }
  }

  return findings;
}

function describeFlow(gesture: Gesture, multiSelect: boolean): Finding | null {
  // Every helper opens exactly one document. A context menu opened over a
  // multi-file selection opens one per file, which is what the test is there
  // to check, so there is nothing to recommend.
  if (multiSelect) {
    return null;
  }
  if (!isOwnStatement(gesture.node)) {
    return null;
  }
  const { label } = gesture;
  if (label !== null && NO_KERNEL_FACTORY_PATTERN.test(label)) {
    return { messageId: 'preferNotebookOpenNoKernel', factory: label };
  }
  return label === null
    ? { messageId: 'preferFilebrowserOpen', factory: null }
    : { messageId: 'preferFilebrowserOpenFactory', factory: label };
}

const galataPreferContextMenuHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-context-menu-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer the Galata filebrowser and notebook open helpers over a raw right-click `Open With` context menu sequence'
    },
    messages: {
      preferNotebookOpenNoKernel:
        'Prefer `page.notebook.open(name, { noKernel: true })` over a raw right-click, `Open With`, `Notebook (no kernel)` sequence.',
      preferFilebrowserOpenFactory:
        "Prefer `page.filebrowser.open(path, '{{factory}}')` over a raw right-click, `Open With`, factory sequence.",
      preferFilebrowserOpen:
        'Prefer `page.filebrowser.open(path, factory)` (or `page.notebook.open(name, { noKernel: true })`) over a raw right-click, `Open With`, factory sequence.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    // One replay per test, keyed by its scope node, so a file that opens
    // several documents this way does not re-read the same statements once per
    // click.
    const scopeCache = new WeakMap<
      TSESTree.Node,
      Map<TSESTree.CallExpression, Finding>
    >();

    const resolveBinding = (
      identifier: TSESTree.Identifier
    ): TSESTree.Node | null => {
      const scope: TSESLint.Scope.Scope =
        context.sourceCode.getScope(identifier);
      return resolveLocatorBinding(identifier, scope);
    };

    return {
      CallExpression(node) {
        // The reported call is always a click on a factory item, so everything
        // else can be skipped before any scope is walked.
        const callee = node.callee;
        if (
          callee.type !== 'MemberExpression' ||
          callee.computed ||
          callee.property.type !== 'Identifier' ||
          callee.property.name !== 'click'
        ) {
          return;
        }

        const scope = enclosingTestScope(node);
        let findings = scopeCache.get(scope);
        if (!findings) {
          findings = findOpenWithFlows(scope, resolveBinding);
          scopeCache.set(scope, findings);
        }

        const finding = findings.get(node);
        if (!finding) {
          return;
        }

        context.report({
          node,
          messageId: finding.messageId,
          ...(finding.factory !== null
            ? { data: { factory: finding.factory } }
            : {})
        });
      }
    };
  }
});

export = galataPreferContextMenuHelper;
