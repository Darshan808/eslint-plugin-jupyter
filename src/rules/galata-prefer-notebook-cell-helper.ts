/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';
import {
  SelectorInteractionMatch,
  combineStaticSelectorText,
  matchSelectorInteraction
} from '../utils/playwright-selectors';

type MessageIds =
  | 'preferSetCell'
  | 'preferEnterCellEditingMode'
  | 'preferSelectCells'
  | 'preferRunCell';
type Options = [];

// A cell *root* token, required somewhere in the selector chain.
const CELL_CONTEXT_PATTERN =
  /jp-(?:Cell|CodeCell|MarkdownCell|RawCell)[\w-]*|jp-Notebook-cell|data-windowed-list-index/;

// Widgets that reuse cell markup but that `page.notebook` does not drive: the
// console hosts real `.jp-Cell` widgets, and the file selector dialog embeds
// notebook-ish markup of its own.
const FOREIGN_CONTEXT_PATTERN =
  /jp-CodeConsole|jp-Dialog\b|jp-FileEditor|jp-Terminal\b/;

// The editor host inside a cell input area. Only consulted once
// CELL_CONTEXT_PATTERN has already proven a cell root is in the same chain.
const EDITOR_TARGET_PATTERN =
  /jp-Cell-inputArea(?![\w-])|jp-InputArea-editor(?![\w-])|jp-CodeMirrorEditor|cm-editor(?![\w-])|cm-content(?![\w-])/;

// The cell element itself, not a widget rendered inside it. The `(?![\w-])`
// anchors keep `jp-Cell-inputCollapser`, `jp-CellToolbar`, … out.
const CELL_TARGET_PATTERN =
  /jp-(?:Cell|CodeCell|MarkdownCell|RawCell)(?![\w-])|jp-Notebook-cell(?![\w-])|data-windowed-list-index/;

// The JupyterLab notebook run shortcuts. `ControlOrMeta+Enter` is Playwright's
// platform-neutral spelling. Any other key on a cell is not a run.
const RUN_SHORTCUT_PATTERN =
  /^(?:Shift|Control|Alt|Meta|ControlOrMeta)\+Enter$/;

const EDIT_GESTURES: ReadonlySet<string> = new Set([
  'fill',
  'type',
  'pressSequentially'
]);
const CLICK_GESTURES: ReadonlySet<string> = new Set(['click', 'dblclick']);

/**
 * The element the gesture actually lands on: the trailing segment of the
 * selector, after the last `>>` combinator or descendant space.
 */
function lastSelectorSegment(selectorText: string): string {
  const segments = selectorText.split(/\s*>>\s*|\s+/).filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

/**
 * The combined selector text, but only when *every* part is fully static.
 */
function fullyStaticSelectorText(
  match: SelectorInteractionMatch
): string | null {
  for (const { argNode } of match.selectorParts) {
    if (argNode.type === 'TemplateLiteral') {
      if (argNode.expressions.length > 0) {
        return null;
      }
    } else if (
      argNode.type !== 'Literal' ||
      typeof argNode.value !== 'string'
    ) {
      return null;
    }
  }
  return combineStaticSelectorText(match);
}

/** The string value of an argument, or null when it is not a static string. */
function staticStringArgument(
  node: TSESTree.CallExpression,
  index: number
): string | null {
  const arg = node.arguments[index];
  if (!arg) {
    return null;
  }
  if (arg.type === 'Literal') {
    return typeof arg.value === 'string' ? arg.value : null;
  }
  if (arg.type === 'TemplateLiteral' && arg.expressions.length === 0) {
    return arg.quasis[0]?.value.cooked ?? null;
  }
  return null;
}

/** True for a `page.keyboard.press(...)` call. */
function isKeyboardPress(node: TSESTree.CallExpression): boolean {
  const { callee } = node;
  return (
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'press' &&
    callee.object.type === 'MemberExpression' &&
    !callee.object.computed &&
    callee.object.object.type === 'Identifier' &&
    callee.object.object.name === 'page' &&
    callee.object.property.type === 'Identifier' &&
    callee.object.property.name === 'keyboard'
  );
}

/**
 * The statement containing `node` that sits directly in a block or program
 * body, so that sibling statements can be compared.
 */
function enclosingBodyStatement(node: TSESTree.Node): TSESTree.Node | null {
  let current: TSESTree.Node | undefined = node;
  while (current) {
    const parent: TSESTree.Node | undefined = current.parent;
    if (
      parent &&
      (parent.type === 'BlockStatement' || parent.type === 'Program')
    ) {
      return current;
    }
    current = parent;
  }
  return null;
}

function previousSiblingStatement(
  statement: TSESTree.Node
): TSESTree.Node | null {
  const parent = statement.parent;
  if (
    !parent ||
    (parent.type !== 'BlockStatement' && parent.type !== 'Program')
  ) {
    return null;
  }
  const body: TSESTree.Node[] = parent.body;
  const index = body.indexOf(statement);
  return index > 0 ? body[index - 1] : null;
}

const galataPreferNotebookCellHelper = createRule<Options, MessageIds>({
  name: 'galata-prefer-notebook-cell-helper',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Prefer the Galata notebook helper over raw Playwright selectors and run shortcuts for notebook cell operations'
    },
    messages: {
      preferSetCell:
        'Prefer `page.notebook.setCell(index, type, source)` (or `page.notebook.addCell(type, source)`) over typing into a cell editor directly.',
      preferEnterCellEditingMode:
        'Prefer `page.notebook.enterCellEditingMode(index)` over clicking into a cell editor directly.',
      preferSelectCells:
        'Prefer `page.notebook.selectCells(startIndex, endIndex)` (or `page.notebook.getCellLocator(index)`) over clicking a notebook cell directly.',
      preferRunCell:
        'Prefer `page.notebook.runCell(index)` (or `page.notebook.run()`) over pressing the run shortcut.'
    },
    schema: []
  },
  defaultOptions: [],
  create(context) {
    // Statements this rule has already reported on, so that a bare
    // `page.keyboard.press('Shift+Enter')` can tell whether it is finishing a
    // raw cell interaction (report) or doing something deliberate (stay
    // silent).
    const reportedStatements = new Set<TSESTree.Node>();

    function report(
      node: TSESTree.CallExpression,
      messageId: MessageIds
    ): void {
      const statement = enclosingBodyStatement(node);
      if (statement) {
        reportedStatements.add(statement);
      }
      context.report({ node, messageId });
    }

    function checkKeyboardPress(node: TSESTree.CallExpression): void {
      const key = staticStringArgument(node, 0);
      if (key === null || !RUN_SHORTCUT_PATTERN.test(key)) {
        return;
      }

      // A bare keyboard press carries no context whatsoever: there is no
      // selector to say whether the focus is in a notebook, a console or a
      // file editor's console panel, no cell index to put in the suggested
      // `runCell(index)`, and no way to tell whether the binding is itself
      // the thing under test. The only unambiguous shape
      // is the shortcut completing a raw cell interaction already flagged
      // here.
      const statement = enclosingBodyStatement(node);
      if (!statement) {
        return;
      }
      const previous = previousSiblingStatement(statement);
      if (!previous || !reportedStatements.has(previous)) {
        return;
      }

      report(node, 'preferRunCell');
    }

    function checkSelectorInteraction(node: TSESTree.CallExpression): void {
      const match = matchSelectorInteraction(node);
      if (!match) {
        return;
      }

      // Right-clicks open the context menu, which has no notebook helper.
      if (match.isRightClick) {
        return;
      }

      const selectorText = fullyStaticSelectorText(match);
      if (selectorText === null) {
        return;
      }

      // The console, the file editor and dialogs reuse cell markup.
      if (FOREIGN_CONTEXT_PATTERN.test(selectorText)) {
        return;
      }

      // Without a cell root somewhere in the chain there is no proof this is a
      // notebook cell at all.
      if (!CELL_CONTEXT_PATTERN.test(selectorText)) {
        return;
      }

      // `page.notebook` has nothing to offer for a widget merely *rendered
      // inside* a cell (an output link, the delete-cell button, the input
      // collapser), so the gesture has to land on the cell or its editor.
      const target = lastSelectorSegment(selectorText);
      const targetsEditor = EDITOR_TARGET_PATTERN.test(target);
      const targetsCell = CELL_TARGET_PATTERN.test(target);
      if (!targetsEditor && !targetsCell) {
        return;
      }

      const gesture = match.interactionMethod;

      if (gesture === 'press') {
        // `page.press(selector, key)` vs `page.locator(selector).press(key)`.
        const key = staticStringArgument(node, match.viaLocatorChain ? 0 : 1);
        if (key !== null && RUN_SHORTCUT_PATTERN.test(key)) {
          report(node, 'preferRunCell');
        }
        return;
      }

      if (EDIT_GESTURES.has(gesture)) {
        if (targetsEditor) {
          report(node, 'preferSetCell');
        }
        return;
      }

      if (CLICK_GESTURES.has(gesture)) {
        report(
          node,
          targetsEditor ? 'preferEnterCellEditingMode' : 'preferSelectCells'
        );
      }
    }

    return {
      CallExpression(node) {
        if (isKeyboardPress(node)) {
          checkKeyboardPress(node);
          return;
        }
        checkSelectorInteraction(node);
      }
    };
  }
});

export = galataPreferNotebookCellHelper;
