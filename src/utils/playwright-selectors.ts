/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import { TSESTree } from '@typescript-eslint/utils';

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
 */
function collectLocatorChainSelectors(
  node: TSESTree.Node
): SelectorPart[] | null {
  const selectors: SelectorPart[] = [];
  let current: TSESTree.Node = node;
  for (;;) {
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
    if (isPageIdentifier(callee.object)) {
      return selectors.length > 0 ? selectors : null;
    }
    current = callee.object;
  }
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
  const selectorParts = collectLocatorChainSelectors(callee.object);
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
