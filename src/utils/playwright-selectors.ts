/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { ASTUtils, TSESLint, TSESTree } from '@typescript-eslint/utils';

/**
 * Playwright locator-producing methods.
 */
export const LOCATOR_METHODS: ReadonlySet<string> = new Set([
  'locator',
  'getByRole',
  'getByText',
  'getByTitle',
  'getByLabel',
  'getByTestId',
  'getByPlaceholder',
  'getByAltText'
]);

/**
 * Playwright interaction methods. Called directly on `page` they take a
 * selector as first argument (`page.click(sel)`); called on a locator they
 * act on the already-selected element (`page.locator(sel).click()`).
 */
export const INTERACTION_METHODS: ReadonlySet<string> = new Set([
  'click',
  'dblclick',
  'hover',
  'tap',
  'fill',
  'type',
  'pressSequentially',
  'check',
  'uncheck',
  'selectOption',
  'focus',
  'waitForSelector',
  'press'
]);

/**
 * Locator methods that pass the locator through without adding a selector,
 * e.g. `page.locator(sel).first().click()`.
 */
const CHAIN_PASSTHROUGH_METHODS: ReadonlySet<string> = new Set([
  'first',
  'last',
  'nth'
]);

/**
 * Locator methods whose argument is matched against element text rather
 * than being a CSS selector.
 */
const TEXT_MATCH_METHODS: ReadonlySet<string> = new Set([
  'getByText',
  'getByTitle',
  'getByLabel',
  'getByPlaceholder',
  'getByAltText'
]);

export interface SelectorPart {
  /**
   * The method that received the argument: a locator method for chains, or
   * the interaction method itself for direct calls (`page.click(sel)`).
   */
  method: string;
  /** The selector or text argument. */
  argNode: TSESTree.Expression;
  /**
   * For `getByRole(role, { name })`, the accessible-name option. `argNode`
   * holds the role. Undefined for every other locator method.
   */
  nameArgNode?: TSESTree.Expression;
}

export interface SelectorInteractionMatch {
  /** The outer CallExpression performing the interaction (report anchor). */
  callNode: TSESTree.CallExpression;
  /**
   * The selector arguments, root-to-tip: one for a direct call, one per
   * locator call in a chain (`page.locator(a).getByText(b).click()` → [a, b]).
   */
  selectorParts: SelectorPart[];
  /** true for `page.locator(sel).click()`, false for `page.click(sel)`. */
  viaLocatorChain: boolean;
  /** Name of the interaction method, e.g. 'click', 'dblclick', 'fill'. */
  interactionMethod: string;
  /** true when the call passes `{ button: 'right' }` (context menu open). */
  isRightClick: boolean;
}

export interface StaticSelectorTextOptions {
  /** Whether to combine static pieces of interpolated template selectors. */
  allowPartialTemplate?: boolean;
}

/**
 * Resolves an identifier holding a locator to the expression it was assigned,
 * or returns null when the binding must not be followed. Passed in by a rule
 * that has a scope to look the name up in.
 */
export type LocatorBindingResolver = (
  node: TSESTree.Identifier
) => TSESTree.Node | null;

/**
 * The expression a locator-holding identifier was assigned, or null when the
 * binding must not be followed. A locator held in a variable then reaches the
 * same `page` root as the inline chain.
 *
 * Only a `const` declared with an initializer is followed. `const` is what
 * makes the assignment the single write, so the expression read here is the
 * one the gesture acts on; a `let` could hold a different locator by then.
 *
 * This is the resolver a rule normally passes as the `resolveBinding`
 * argument of {@link matchSelectorInteraction}.
 */
export function resolveLocatorBinding(
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

function isPageIdentifier(node: TSESTree.Node): boolean {
  return node.type === 'Identifier' && node.name === 'page';
}

/** Strips the `!` and `as T` wrappers a locator expression may carry. */
function unwrapAssertions(node: TSESTree.Node): TSESTree.Node {
  let current = node;
  while (
    current.type === 'TSNonNullExpression' ||
    current.type === 'TSAsExpression' ||
    current.type === 'AwaitExpression'
  ) {
    current =
      current.type === 'AwaitExpression'
        ? current.argument
        : current.expression;
  }
  return current;
}

function firstArgument(
  node: TSESTree.CallExpression
): TSESTree.Expression | null {
  const arg = node.arguments[0];
  return arg && arg.type !== 'SpreadElement' ? arg : null;
}

/**
 * True when an interaction call passes `{ button: 'right' }` option.
 */
export function isRightClick(node: TSESTree.CallExpression): boolean {
  return node.arguments.some(
    arg =>
      arg.type === 'ObjectExpression' &&
      arg.properties.some(
        prop =>
          prop.type === 'Property' &&
          !prop.computed &&
          ((prop.key.type === 'Identifier' && prop.key.name === 'button') ||
            (prop.key.type === 'Literal' && prop.key.value === 'button')) &&
          prop.value.type === 'Literal' &&
          prop.value.value === 'right'
      )
  );
}

/**
 * Reads the static `name` option of a `getByRole(role, { name })` call.
 */
function roleNameArgument(
  node: TSESTree.CallExpression
): TSESTree.Expression | undefined {
  const options = node.arguments[1];
  if (!options || options.type !== 'ObjectExpression') {
    return undefined;
  }
  for (const prop of options.properties) {
    if (
      prop.type === 'Property' &&
      !prop.computed &&
      ((prop.key.type === 'Identifier' && prop.key.name === 'name') ||
        (prop.key.type === 'Literal' && prop.key.value === 'name')) &&
      prop.value.type !== 'AssignmentPattern' &&
      prop.value.type !== 'TSEmptyBodyFunctionExpression'
    ) {
      return prop.value as TSESTree.Expression;
    }
  }
  return undefined;
}

/**
 * Walks a locator-producing chain rooted at `page`, e.g.
 * `page.locator(a).getByText(b).first()`, and returns the selector arguments
 * in root-to-tip order. Returns null when the chain is not rooted at `page`,
 * contains a non-locator call, or carries no selector argument at all.
 *
 * With a `resolveBinding` callback the walk also steps through an identifier
 * holding a locator, so that `const cell = page.locator(a); cell.click();`
 * reaches the same `page` root as the inline form.
 */
function collectLocatorChainSelectors(
  node: TSESTree.Node,
  resolveBinding?: LocatorBindingResolver
): SelectorPart[] | null {
  const selectors: SelectorPart[] = [];
  let current: TSESTree.Node = unwrapAssertions(node);
  // A binding may itself be assigned from another binding, so the walk can
  // alternate between resolving a name and stepping down a call. The bound
  // stops a cycle such as `const a = b, b = a` from looping.
  for (let steps = 0; steps < 32; steps++) {
    if (current.type === 'Identifier') {
      const resolved = resolveBinding ? resolveBinding(current) : null;
      if (!resolved) {
        return null;
      }
      current = unwrapAssertions(resolved);
      continue;
    }
    if (current.type !== 'CallExpression') {
      return null;
    }
    const callee = current.callee;
    if (
      callee.type !== 'MemberExpression' ||
      callee.computed ||
      callee.property.type !== 'Identifier'
    ) {
      return null;
    }
    if (LOCATOR_METHODS.has(callee.property.name)) {
      const arg = firstArgument(current);
      if (arg) {
        selectors.unshift({
          method: callee.property.name,
          argNode: arg,
          ...(callee.property.name === 'getByRole'
            ? { nameArgNode: roleNameArgument(current) }
            : {})
        });
      }
    } else if (!CHAIN_PASSTHROUGH_METHODS.has(callee.property.name)) {
      return null;
    }
    const object = unwrapAssertions(callee.object);
    if (isPageIdentifier(object)) {
      return selectors.length > 0 ? selectors : null;
    }
    current = object;
  }
  return null;
}

/**
 * Matches raw Playwright selector interactions on the Galata `page` fixture:
 *
 * - `page.<interaction>(selector, ...)` e.g. `page.dblclick('text=a.ipynb')`
 * - `page.<locatorMethod>(selector)[...].<interaction>(...)` e.g.
 *   `page.locator('.jp-DirListing-item').click()` or chained locators like
 *   `page.locator('#filebrowser').getByText('notebooks').dblclick()`
 *
 * Returns null for any other shape
 *
 * `resolveBinding` is optional. Without it a chain has to be written inline
 * from `page`; with it a locator held in a variable is followed to its
 * assignment first.
 */
export function matchSelectorInteraction(
  node: TSESTree.CallExpression,
  resolveBinding?: LocatorBindingResolver
): SelectorInteractionMatch | null {
  const { callee } = node;
  if (callee.type !== 'MemberExpression' || callee.computed) {
    return null;
  }
  const property = callee.property;
  if (
    property.type !== 'Identifier' ||
    !INTERACTION_METHODS.has(property.name)
  ) {
    return null;
  }

  // page.click(selector, ...)
  if (isPageIdentifier(callee.object)) {
    const selectorArgNode = firstArgument(node);
    return selectorArgNode
      ? {
          callNode: node,
          selectorParts: [{ method: property.name, argNode: selectorArgNode }],
          viaLocatorChain: false,
          interactionMethod: property.name,
          isRightClick: isRightClick(node)
        }
      : null;
  }

  // page.locator(selector).getByText(...).click(...)
  const selectorParts = collectLocatorChainSelectors(
    callee.object,
    resolveBinding
  );
  return selectorParts
    ? {
        callNode: node,
        selectorParts,
        viaLocatorChain: true,
        interactionMethod: property.name,
        isRightClick: isRightClick(node)
      }
    : null;
}

/**
 * Extracts a best-effort static string from a selector argument so it can be
 * matched against known patterns. String literals return their value;
 * template literals return their static parts joined by a space, so
 * `` `.jp-DirListing-item span:has-text("${name}")` `` still exposes its
 * static prefix. Pass `allowPartialTemplate: false` when interpolated
 * templates should be treated as dynamic. Fully dynamic expressions return
 * null.
 */
export function extractStaticSelectorText(
  node: TSESTree.Expression,
  options: StaticSelectorTextOptions = {}
): string | null {
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  const allowPartialTemplate = options.allowPartialTemplate !== false;
  if (node.type === 'TemplateLiteral') {
    if (!allowPartialTemplate) {
      return node.expressions.length > 0
        ? null
        : node.quasis
            .map(quasi => quasi.value.cooked ?? quasi.value.raw)
            .join('');
    }
    return node.quasis.map(quasi => quasi.value.cooked ?? '').join(' ');
  }
  return null;
}

/**
 * Joins the statically extractable selector parts of a match into a single
 * pattern-matchable string. Arguments of text-matching locators (`getByText`,
 * `getByTitle`, …) are normalized to the `text=` selector form, so patterns
 * written against `text=` selectors also match the locator-method shape.
 * `getByRole(role, { name })` is normalized to the CSS-attribute form
 * `[role="<role>"] text=<name>` for the same reason. Returns null when no part
 * is static.
 */
export function combineStaticSelectorText(
  match: SelectorInteractionMatch
): string | null {
  const parts: string[] = [];
  for (const { method, argNode, nameArgNode } of match.selectorParts) {
    const text = extractStaticSelectorText(argNode);
    if (text === null) {
      continue;
    }
    if (method === 'getByRole') {
      // The role is emitted even without a name, but a name is never emitted
      // without its role: a bare `text=File` from a dynamic role would look
      // like an unscoped label and could be mistaken for a menu bar item.
      const name = nameArgNode ? extractStaticSelectorText(nameArgNode) : null;
      parts.push(
        name === null ? `[role="${text}"]` : `[role="${text}"] text=${name}`
      );
      continue;
    }
    parts.push(TEXT_MATCH_METHODS.has(method) ? `text=${text}` : text);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

function isNode(value: unknown): value is TSESTree.Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

/**
 * Calls `visit` for every child node of `node`, in no particular order.
 *
 * `parent` is skipped: it is a back-reference, and following it would not
 * terminate. A caller that needs source order has to sort the result itself.
 */
export function forEachChildNode(
  node: TSESTree.Node,
  visit: (child: TSESTree.Node) => void
): void {
  for (const [key, value] of Object.entries(
    node as unknown as Record<string, unknown>
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
}

/**
 * Calls whose callback is stored and run later. Statements next to such a call
 * say nothing about the state its body starts in.
 */
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
 * Whether `node` bounds the statements a rule may read as "what ran before".
 *
 * A rule that reasons about UI state — which menu is open, what was selected —
 * reads the statements preceding a gesture. That reading has to stop somewhere,
 * and the boundary is the unit that runs as one: a test callback or a named
 * function.
 */
export function isTestScopeBoundary(node: TSESTree.Node): boolean {
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

/**
 * The innermost test callback or named function containing `node`, which is
 * where a lookback over preceding statements has to stop. Falls back to the
 * `Program` for a gesture written at the top level of a file.
 */
export function enclosingTestScope(node: TSESTree.Node): TSESTree.Node {
  let scope: TSESTree.Node = node;
  while (scope.parent && !isTestScopeBoundary(scope)) {
    scope = scope.parent;
  }
  return scope;
}
