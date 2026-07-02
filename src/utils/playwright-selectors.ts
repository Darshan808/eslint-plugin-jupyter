/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/utils';

/**
 * Playwright locator-producing methods whose first argument is a
 * selector/text string, e.g. `page.locator('.jp-DirListing-item')`.
 */
export const LOCATOR_METHODS: ReadonlySet<string> = new Set([
  'locator',
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
  'check',
  'uncheck',
  'selectOption',
  'focus',
  'waitForSelector',
  'press'
]);

export interface SelectorInteractionMatch {
  /** The outer CallExpression performing the interaction (report anchor). */
  callNode: TSESTree.CallExpression;
  /** The selector argument, from the direct call or the inner locator call. */
  selectorArgNode: TSESTree.Expression;
  /** true for `page.locator(sel).click()`, false for `page.click(sel)`. */
  viaLocatorChain: boolean;
}

function isPageIdentifier(node: TSESTree.Node): boolean {
  return node.type === 'Identifier' && node.name === 'page';
}

function firstArgument(
  node: TSESTree.CallExpression
): TSESTree.Expression | null {
  const arg = node.arguments[0];
  return arg && arg.type !== 'SpreadElement' ? arg : null;
}

/**
 * Matches raw Playwright selector interactions on the Galata `page` fixture:
 *
 * - `page.<interaction>(selector, ...)` e.g. `page.dblclick('text=a.ipynb')`
 * - `page.<locatorMethod>(selector).<interaction>(...)` e.g.
 *   `page.locator('.jp-DirListing-item').click()`
 *
 * Returns null for any other shape, including Galata helper calls such as
 * `page.filebrowser.open(...)` and nested chains like
 * `page.keyboard.press(...)`.
 */
export function matchSelectorInteraction(
  node: TSESTree.CallExpression
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
      ? { callNode: node, selectorArgNode, viaLocatorChain: false }
      : null;
  }

  // page.locator(selector).click(...)
  if (callee.object.type === 'CallExpression') {
    const inner = callee.object;
    const innerCallee = inner.callee;
    if (
      innerCallee.type === 'MemberExpression' &&
      !innerCallee.computed &&
      isPageIdentifier(innerCallee.object) &&
      innerCallee.property.type === 'Identifier' &&
      LOCATOR_METHODS.has(innerCallee.property.name)
    ) {
      const selectorArgNode = firstArgument(inner);
      return selectorArgNode
        ? { callNode: node, selectorArgNode, viaLocatorChain: true }
        : null;
    }
  }

  return null;
}

/**
 * Extracts a best-effort static string from a selector argument so it can be
 * matched against known patterns. String literals return their value;
 * template literals return their static parts joined by a space, so
 * `` `.jp-DirListing-item span:has-text("${name}")` `` still exposes its
 * static prefix. Fully dynamic expressions return null.
 */
export function extractStaticSelectorText(
  node: TSESTree.Expression
): string | null {
  if (node.type === 'Literal') {
    return typeof node.value === 'string' ? node.value : null;
  }
  if (node.type === 'TemplateLiteral') {
    return node.quasis.map(quasi => quasi.value.cooked ?? '').join(' ');
  }
  return null;
}
