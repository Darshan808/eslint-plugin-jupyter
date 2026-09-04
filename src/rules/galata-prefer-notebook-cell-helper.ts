/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ASTUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule } from '../utils/create-rule';
import {
  SelectorInteractionMatch,
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
  /\.jp-(?:Cell|CodeCell|MarkdownCell|RawCell)[\w-]*|\.jp-Notebook-cell/;

// Widgets that reuse cell markup but that `page.notebook` does not drive: the
// console hosts real `.jp-Cell` widgets, and the file selector dialog embeds
// notebook-ish markup of its own.
const FOREIGN_CONTEXT_PATTERN =
  /jp-CodeConsole|jp-Dialog\b|jp-FileEditor|jp-Terminal\b/;

// The editor host inside a cell input area. Only consulted once
// CELL_CONTEXT_PATTERN has already proven a cell root is in the same chain.
const EDITOR_TARGET_PATTERN =
  /\.jp-Cell-inputArea(?![\w-])|\.jp-InputArea-editor(?![\w-])|\.jp-CodeMirrorEditor(?![\w-])|\.cm-editor(?![\w-])|\.cm-content(?![\w-])/;

// A cell's output area. JupyterLab itself puts no editor there, but a mime
// renderer or a widget can, so an editor target scoped to an output is not the
// cell's own input and has no `setCell()` to suggest.
const OUTPUT_AREA_PATTERN = /\.jp-Cell-outputArea|\.jp-OutputArea/;

// The cell element itself, not a widget rendered inside it. The `(?![\w-])`
// anchors keep `jp-Cell-inputCollapser`, `jp-CellToolbar`, … out. The input
// prompt counts: `selectCells()` clicks the cell at `{ x: 15, y: 5 }`, which is
// that same gutter, so clicking it *is* the helper's own gesture.
const CELL_TARGET_PATTERN =
  /\.jp-(?:Cell|CodeCell|MarkdownCell|RawCell)(?![\w-])|\.jp-Notebook-cell(?![\w-])|\.jp-InputArea-prompt(?![\w-])/;

// The JupyterLab notebook run shortcuts. `ControlOrMeta+Enter` is Playwright's
// platform-neutral spelling. Any other key on a cell is not a run.
const RUN_SHORTCUT_PATTERN =
  /^(?:Shift|Control|Alt|Meta|ControlOrMeta)\+Enter$/;

// Playwright selector engines whose argument is matched against page content
// rather than markup, in the `engine=body` form. A bare `"quoted"` segment is
// the text engine's shorthand.
const CONTENT_ENGINE_PATTERN =
  /^(?:text|id|data-testid|data-test-id|data-test|role|xpath)\s*=|^["']/;

// Playwright engines that only *filter* the preceding segment rather than
// selecting anything of their own, so the real target is the segment before.
const PASSTHROUGH_ENGINE_PATTERN = /^(?:nth|visible)\s*=/;

// The argument of a pseudo-class is a different selector branch, or page
// content: `.widget:not(.jp-Cell)` is not a cell and `:has-text("x")` is text.
// Stripping innermost-first also unwraps nesting such as `:not(:has(.jp-Cell))`.
const PSEUDO_ARGUMENT_PATTERN = /:[\w-]+\([^()]*\)/g;

// Quoted attribute *values* are content too: `[title="jp-Cell"]` is not a cell.
const QUOTED_VALUE_PATTERN = /"[^"]*"|'[^']*'/g;

// A union (`.other, .jp-Cell`) or a sibling combinator (`.jp-Cell + .cm-editor`)
// breaks the ancestor relationship the token checks assume: the cell token can
// then sit in a branch the gesture never lands in. Checked after the content
// strip above, so `:nth-child(2n+1)` and `:has-text("a, b")` are unaffected.
const AMBIGUOUS_STRUCTURE_PATTERN = /[,+~]/;

const EDIT_GESTURES: ReadonlySet<string> = new Set([
  'fill',
  'type',
  'pressSequentially'
]);
const CLICK_GESTURES: ReadonlySet<string> = new Set(['click', 'dblclick']);

interface SelectorSegment {
  /** The segment as written, used for the deliberately broad scope exclusion. */
  raw: string;
  /** The segment text; for CSS segments, stripped of embedded page content. */
  text: string;
  /** True when the segment is markup rather than matched page content. */
  isCss: boolean;
}

/** Removes the page content and side branches embedded in a CSS segment. */
function stripContent(cssSegment: string): string {
  let stripped = cssSegment;
  for (;;) {
    const next = stripped.replace(PSEUDO_ARGUMENT_PATTERN, '');
    if (next === stripped) {
      break;
    }
    stripped = next;
  }
  return stripped.replace(QUOTED_VALUE_PATTERN, '');
}

/**
 * True when a literal is a `modifiers` entry `selectCells()` reproduces.
 * `selectCells(start, end)` shift-clicks the end cell, so `['Shift']` is
 * covered; `Control`/`Meta` toggle an individual cell into the selection,
 * which has no helper at all.
 */
function isSupportedModifier(element: TSESTree.Node | null): boolean {
  return element?.type === 'Literal' && element.value === 'Shift';
}

/**
 * True when the interaction's options object holds anything the notebook
 * helper cannot reproduce, so that only the plain gesture is ever reported:
 *
 * - `button` — only a primary click selects a cell; a right click opens the
 *   context menu and a middle click has no cell binding at all.
 * - `modifiers` — see `isSupportedModifier`.
 * - `trial` — Playwright runs the actionability checks and then performs no
 *   click, so suggesting `selectCells()` would turn a no-op into a selection.
 *
 * An unknown key is treated as unsupported: a computed key or a spread could
 * carry any of the above, and a non-static value could be either.
 */
function hasUnsupportedOptions(node: TSESTree.CallExpression): boolean {
  for (const arg of node.arguments) {
    if (arg.type !== 'ObjectExpression') {
      continue;
    }
    for (const prop of arg.properties) {
      if (prop.type === 'SpreadElement' || prop.computed) {
        return true;
      }
      const key =
        prop.key.type === 'Identifier'
          ? prop.key.name
          : prop.key.type === 'Literal'
            ? prop.key.value
            : null;

      if (key === 'button') {
        if (!(prop.value.type === 'Literal' && prop.value.value === 'left')) {
          return true;
        }
      } else if (key === 'modifiers') {
        if (
          prop.value.type !== 'ArrayExpression' ||
          !prop.value.elements.every(isSupportedModifier)
        ) {
          return true;
        }
      } else if (key === 'trial') {
        if (!(prop.value.type === 'Literal' && prop.value.value === false)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * The selector chain flattened into engine segments, root-to-tip, with each
 * one marked as markup or as matched page content.
 *
 * A class name found in page content proves nothing about the widget being
 * driven — `page.getByText('jp-Cell')` clicks the literal text `jp-Cell`
 * wherever it is rendered — so content segments are kept out of every token
 * test. Returns null when any part does not resolve to a static string, since
 * an interpolated selector hides the scope it was written with. Resolution
 * follows `const` bindings, so the shared
 * ``const cellSelector = '… .jp-Cell'`` idiom is still seen through.
 */
function selectorSegments(
  match: SelectorInteractionMatch,
  scope: TSESLint.Scope.Scope
): SelectorSegment[] | null {
  const segments: SelectorSegment[] = [];
  for (const { method, argNode } of match.selectorParts) {
    const resolved = ASTUtils.getStaticValue(argNode, scope);
    if (!resolved || typeof resolved.value !== 'string') {
      return null;
    }
    const raw = resolved.value;

    // In a locator chain only `locator()` takes a selector; `getByText()`,
    // `getByTestId()`, … all match content. A direct `page.click(sel)` call
    // always takes a selector.
    if (match.viaLocatorChain && method !== 'locator') {
      segments.push({ raw, text: raw, isCss: false });
      continue;
    }

    // A selector string may itself chain engines with `>>`.
    for (const piece of raw.split('>>')) {
      const trimmed = piece.trim();
      if (trimmed.length === 0 || PASSTHROUGH_ENGINE_PATTERN.test(trimmed)) {
        // `>> nth=0` filters the preceding segment; it is not a target.
        continue;
      }
      segments.push(
        CONTENT_ENGINE_PATTERN.test(trimmed)
          ? { raw: trimmed, text: trimmed, isCss: false }
          : { raw: trimmed, text: stripContent(trimmed), isCss: true }
      );
    }
  }
  return segments.length > 0 ? segments : null;
}

/**
 * The element the gesture actually lands on: the last simple selector of the
 * trailing segment, after any descendant/child/sibling combinator.
 */
function targetToken(segment: SelectorSegment): string {
  const simples = segment.text.split(/[\s>+~]+/).filter(Boolean);
  return simples[simples.length - 1] ?? '';
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

/**
 * The expression a locator-holding identifier was assigned, or null when the
 * binding must not be followed.
 *
 * Only a `const` declared with an initializer is followed. `const` is what
 * makes the assignment the single write, so the expression read here is the
 * one the gesture acts on; a `let` could hold a different locator by then.
 */
function resolveLocatorBinding(
  node: TSESTree.Identifier,
  scope: TSESLint.Scope.Scope
): TSESTree.Node | null {
  const variable = ASTUtils.findVariable(scope, node);
  if (!variable || variable.defs.length !== 1) {
    return null;
  }
  const declarator = variable.defs[0].node;
  if (declarator.type !== 'VariableDeclarator' || !declarator.init) {
    return null;
  }
  const declaration = declarator.parent;
  if (
    declaration?.type !== 'VariableDeclaration' ||
    declaration.kind !== 'const'
  ) {
    return null;
  }
  return declarator.init;
}

/**
 * True for a statement that only asserts: `expect(x).toBe(y)`,
 * `await expect(x).toBeVisible()`, `await expect.soft(x).not.toBeInViewport()`.
 * An assertion performs no gesture of its own, so a run shortcut written after
 * one is still finishing the interaction before it.
 */
function isAssertionStatement(statement: TSESTree.Node): boolean {
  if (statement.type !== 'ExpressionStatement') {
    return false;
  }
  let current: TSESTree.Node = statement.expression;
  if (current.type === 'AwaitExpression') {
    current = current.argument;
  }
  // Walk the call chain down to its root: `expect(x).not.toBe(y)` → `expect`.
  while (
    current.type === 'CallExpression' ||
    current.type === 'MemberExpression'
  ) {
    current =
      current.type === 'CallExpression' ? current.callee : current.object;
  }
  return current.type === 'Identifier' && current.name === 'expect';
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
      // Only an interaction that is a statement in its own right can be
      // compared with its siblings: `if (hasCell) await cell.click();` hangs
      // off an `IfStatement`, so a shortcut after the `if` runs even when the
      // click did not and must not be armed by it. Two statements sharing a
      // block do always run together, conditional block or not.
      if (statement?.type === 'ExpressionStatement') {
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
      if (statement?.type !== 'ExpressionStatement') {
        return;
      }
      // Assertions in between are stepped over: a test routinely checks the
      // state the interaction left before running the cell.
      let previous = previousSiblingStatement(statement);
      while (previous && isAssertionStatement(previous)) {
        previous = previousSiblingStatement(previous);
      }
      if (!previous || !reportedStatements.has(previous)) {
        return;
      }

      report(node, 'preferRunCell');
    }

    function checkSelectorInteraction(node: TSESTree.CallExpression): void {
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

      if (hasUnsupportedOptions(node)) {
        return;
      }

      const segments = selectorSegments(match, currentScope());
      if (segments === null) {
        return;
      }

      // The console, the file editor and dialogs reuse cell markup.
      if (segments.some(segment => FOREIGN_CONTEXT_PATTERN.test(segment.raw))) {
        return;
      }

      // A union or a sibling combinator puts the cell token in a branch the
      // gesture need not land in, so the chain proves nothing about the target.
      if (
        segments.some(
          segment =>
            segment.isCss && AMBIGUOUS_STRUCTURE_PATTERN.test(segment.text)
        )
      ) {
        return;
      }

      // Without a cell root token somewhere in the chain there is no proof
      // this is a notebook cell at all.
      if (
        !segments.some(
          segment => segment.isCss && CELL_CONTEXT_PATTERN.test(segment.text)
        )
      ) {
        return;
      }

      // `page.notebook` has nothing to offer for a widget merely *rendered
      // inside* a cell (an output link, the delete-cell button, the input
      // collapser), nor for a gesture aimed at matched text, so the gesture
      // has to land on the cell or its editor.
      const lastSegment = segments[segments.length - 1];
      if (!lastSegment.isCss) {
        return;
      }
      const target = targetToken(lastSegment);
      // An editor scoped to the cell's output is not the cell's input.
      const targetsEditor =
        EDITOR_TARGET_PATTERN.test(target) &&
        !segments.some(
          segment => segment.isCss && OUTPUT_AREA_PATTERN.test(segment.text)
        );
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
